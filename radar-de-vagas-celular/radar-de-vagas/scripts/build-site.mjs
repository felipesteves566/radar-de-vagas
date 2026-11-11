#!/usr/bin/env node
// Gera o site estático do Radar (versão celular) a partir do estado coletado.
// Nota de encaixe por regras simples, sem agente: nível do cargo, aderência a
// e-commerce/marketplace e menções a canais. Nenhuma vaga é escondida aqui;
// o filtro é decisão de quem usa, na página.
//
// Uso: RADAR_DATA_DIR=/pasta/absoluta node scripts/build-site.mjs [--out site]

import { mkdir, writeFile, copyFile, readdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadState } from '../src/state.mjs';
import { resolveDataDir } from '../src/data-dir.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outArg = process.argv.indexOf('--out');
const outDir = resolve(root, outArg > -1 ? process.argv[outArg + 1] : 'site');

const MAX_DESC = 4000;
const MAX_AGE_DAYS = 45;      // publicação mais antiga que isso sai do site
const MAX_UNSEEN_DAYS = 10;   // vaga que sumiu das listagens há mais que isso sai do site

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const has = (s, re) => re.test(s);

const LEVELS = [
  { re: /\b(head|diretor|diretora|director|gerente|manager|gestor|gestora|lider|lead)\b/, level: 'gestão', base: 5 },
  { re: /\bcoordenador|coordenadora|coordenacao|coordinator\b/, level: 'coordenação', base: 5 },
  { re: /\b(especialista|specialist|senior|sr\.?|iii)\b/, level: 'sênior/especialista', base: 4 },
  { re: /\bsupervisor|supervisora\b/, level: 'supervisão', base: 4 },
  { re: /\b(analista|analyst|pleno|pl\.?|ii)\b/, level: 'analista', base: 3 },
  { re: /\b(assistente|auxiliar|junior|jr\.?|assistant)\b/, level: 'júnior/assistente', base: 2 },
  { re: /\b(operador|operadora|atendente|estagio|estagiario|estagiaria|aprendiz|jovem|repositor|vendedor|vendedora|promotor)\b/, level: 'operacional', base: 1 },
];
const DOMAIN = /e-?commerce|marketplace|comercio eletronico|digital commerce|e-trade|omnichannel|omnicanal|loja virtual|canais digitais|vendas online|trade digital/;
const ADJACENT = /\b(designer|desenvolvedor|developer|programador|fp&a|logistica|dados|data|ux|ui|seo|midia|performance|crm)\b/;
const CHANNELS = [['mercado livre', /mercado ?livre|meli\b/], ['Amazon', /amazon/], ['Shopee', /shopee/], ['Magalu', /magalu|magazine luiza/], ['TikTok Shop', /tiktok shop/], ['VTEX', /vtex/], ['Full/FBA', /\bfull\b|fulfillment|\bfba\b/]];

function detectModel(job, text) {
  const fixed = { remote: 'remoto', remoto: 'remoto', hybrid: 'híbrido', 'híbrido': 'híbrido', onsite: 'presencial', presencial: 'presencial' }[norm(job.workModel).replace('hibrido', 'híbrido')];
  if (fixed) return fixed;
  const loc = norm(job.location);
  if (/remot|home office|remote/.test(loc)) return 'remoto';
  if (/hibrid|hybrid/.test(loc)) return 'híbrido';
  if (/100% remot|trabalho remoto|modelo remoto|home office/.test(text)) return 'remoto';
  if (/hibrido|modelo hibrido|hybrid/.test(text)) return 'híbrido';
  if (/presencial/.test(text)) return 'presencial';
  return null;
}

export function score(job) {
  const title = norm(job.title);
  const text = norm(job.description);
  const reasons = [], alerts = [];

  const lvl = LEVELS.find(l => has(title, l.re)) ?? { level: 'nível não informado', base: 3 };
  let stars = lvl.base;
  let level = lvl.level;
  // "Júnior" ou estágio no título vale mais que "gestor"/"analista": cargo abaixo do nível buscado.
  if (stars > 2 && /\b(junior|jr\.?|estagio|estagiari[oa]|aprendiz|trainee)\b/.test(title)) { stars = 2; level = 'júnior/assistente'; }
  reasons.push(`Nível: ${level}`);

  if (has(title, DOMAIN)) reasons.push('E-commerce/marketplace no título');
  else if (has(text, DOMAIN)) { stars -= 1; reasons.push('E-commerce só na descrição'); }
  else { stars -= 2; alerts.push('Não cita e-commerce nem marketplace'); }

  if (has(title, ADJACENT) && !/coorden|gerente|head|gestor/.test(title)) { stars -= 1; reasons.push('Área vizinha (design, dados, logística…)'); }

  const channels = CHANNELS.filter(([, re]) => has(text, re)).map(([n]) => n);
  if (channels.length) { reasons.push(`Cita ${channels.join(', ')}`); if (channels.length >= 2 && stars < 5) stars += 1; }

  const model = detectModel(job, text);
  if (/ingles (fluente|avancado)|fluent english|advanced english|english (fluency|proficiency)/.test(text)) alerts.push('Pede inglês avançado/fluente');
  if (/exclusiva (para )?(pessoas com deficiencia|pcd)|vaga pcd|exclusiva pcd/.test(title + ' ' + text)) alerts.push('Vaga exclusiva PcD');
  if (/\bpix\b|dados bancarios|taxa de inscricao|pague|deposito/.test(text)) alerts.push('Possível golpe: fala em pagamento/dados bancários');
  if (/(somente|apenas|chamar|enviar) .{0,25}whats ?app/.test(text)) alerts.push('Contato só por WhatsApp: confira se é real');
  const loc = norm(job.location);
  if (loc && !/brasil|brazil|\b(sp|rj|mg|pr|sc|rs|go|df|ba|pe|ce|es|mt|ms|am|pa)\b|sao paulo|rio de janeiro|remot/.test(loc)) { stars -= 2; alerts.push('Local pode ser fora do Brasil'); }

  stars = Math.max(1, Math.min(5, stars));
  return { stars, level, model, reasons, alerts };
}

function daysAgo(iso, now) { return iso ? (now - Date.parse(iso)) / 86400000 : null; }

async function main() {
  const dataDir = resolveDataDir();
  const state = await loadState({ dataDir });
  const now = Date.now();
  const jobs = [];
  for (const [id, entry] of Object.entries(state.jobs)) {
    const { job, seen } = entry;
    const pubAge = daysAgo(job.publishedAt, now);
    const unseen = daysAgo(seen.lastSeenAt, now);
    if (pubAge !== null && pubAge > MAX_AGE_DAYS) continue;
    if (unseen !== null && unseen > MAX_UNSEEN_DAYS) continue;
    const s = score(job);
    const desc = job.description.length > MAX_DESC ? job.description.slice(0, MAX_DESC) + '…' : job.description;
    jobs.push({ id, source: job.source, url: job.url, title: job.title.trim(), company: job.company, location: job.location,
      publishedAt: job.publishedAt, firstSeenAt: seen.firstSeenAt, description: desc, ...s });
  }
  jobs.sort((a, b) => b.stars - a.stars || (Date.parse(b.publishedAt || b.firstSeenAt) - Date.parse(a.publishedAt || a.firstSeenAt)));
  const sources = Object.fromEntries(Object.entries(state.sources).map(([k, v]) => [k, { lastRunAt: v.lastRunAt, errors: v.errors.filter(e => e.step !== 'limite').length }]));

  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'vagas.json'), JSON.stringify({ generatedAt: new Date().toISOString(), sources, jobs }));
  for (const f of await readdir(join(root, 'web'))) await copyFile(join(root, 'web', f), join(outDir, f));
  await writeFile(join(outDir, '.nojekyll'), '');
  console.log(`Site gerado em ${outDir}: ${jobs.length} vagas.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e.message); process.exit(1); });
