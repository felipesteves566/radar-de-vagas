import { test } from 'node:test';
import assert from 'node:assert/strict';
import { score } from '../scripts/build-site.mjs';

const base = { title: '', description: '', location: 'São Paulo, SP', workModel: null };

test('coordenação em e-commerce com canais recebe nota máxima', () => {
  const r = score({ ...base, title: 'Coordenador de E-commerce', description: 'Gestão de Mercado Livre, Amazon e Shopee.' });
  assert.equal(r.stars, 5);
  assert.equal(r.level, 'coordenação');
});

test('operador de loja fica com nota baixa, mas não é escondido', () => {
  const r = score({ ...base, title: 'Operador(a) de E-commerce - Loja Fictícia', description: 'Separação de pedidos.' });
  assert.equal(r.stars, 1);
});

test('vaga fora do Brasil e sem e-commerce gera alertas', () => {
  const r = score({ ...base, title: 'Analista Financeiro', description: 'Contas a pagar.', location: 'Austin, TX' });
  assert.ok(r.alerts.includes('Não cita e-commerce nem marketplace'));
  assert.ok(r.alerts.includes('Local pode ser fora do Brasil'));
  assert.equal(r.stars, 1);
});

test('sinais de golpe viram alerta', () => {
  const r = score({ ...base, title: 'Analista de Marketplace', description: 'Envie um Pix para a taxa de inscrição.' });
  assert.ok(r.alerts.some(a => a.startsWith('Possível golpe')));
});

test('júnior no título limita a nota mesmo com "gestor"', () => {
  const r = score({ ...base, title: 'Analista e Gestor de Marketplace Júnior', description: 'Marketplaces.' });
  assert.equal(r.stars, 2);
});

test('modelo de trabalho em inglês vira português', () => {
  assert.equal(score({ ...base, title: 'Analista de E-commerce', workModel: 'hybrid' }).model, 'híbrido');
  assert.equal(score({ ...base, title: 'Analista de E-commerce', workModel: 'onsite' }).model, 'presencial');
});
