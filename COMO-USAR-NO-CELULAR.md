# Radar de Vagas no celular

Esta versão roda sozinha no GitHub, de graça, sem computador ligado e sem assinatura de IA. Três vezes por dia (6h, 12h e 18h) ela coleta vagas na Gupy e no LinkedIn e publica uma página que você abre no celular.

**Diferença para a versão completa:** as estrelas vêm de regras simples (nível do cargo, se é e-commerce/marketplace, se cita Mercado Livre, Amazon, Shopee etc.), não de um agente lendo seu perfil. Nada é escondido: vagas com nota baixa aparecem ao trocar o filtro de estrelas.

## Instalar (uma vez, uns 10 minutos, pelo computador)

1. Crie uma conta gratuita em [github.com](https://github.com) (se ainda não tiver).
2. Clique em **New repository**. Nome: `radar-de-vagas`. Marque **Public** (o GitHub Pages gratuito exige repositório público; só vagas públicas e seus termos de busca ficam lá, nenhum dado seu). Clique em **Create repository**.
3. Na página do repositório vazio, clique em **uploading an existing file**. Descompacte o zip no computador e **arraste todo o conteúdo da pasta** `radar-de-vagas` (inclusive a pasta `.github`) para a área de upload. Clique em **Commit changes**.
   - No Windows, se a pasta `.github` não aparecer, ative "Itens ocultos" no menu Exibir do Explorador.
4. Vá em **Settings → Pages**. Em **Source**, escolha **GitHub Actions**.
5. Vá em **Actions**. Se aparecer um botão para habilitar workflows, clique nele. Escolha **radar-celular** na lista e clique em **Run workflow**. A primeira rodada leva de 10 a 20 minutos.
6. Quando terminar (bolinha verde), o endereço aparece no passo **publicar**, algo como `https://SEU-USUARIO.github.io/radar-de-vagas/`.

## No celular

- Abra o endereço no navegador e use **Adicionar à tela inicial** (Chrome: menu ⋮; iPhone/Safari: botão compartilhar). Fica com ícone de app.
- **Novas**: vagas achadas nas últimas 48 horas. **Abertas**: todas que você ainda não marcou.
- **Inscrevi** e **Descartar** (com motivo) ficam salvos no próprio celular. Use **Copiar backup** no rodapé de vez em quando, porque limpar os dados do navegador apaga as marcações.

## Mudar o que o radar procura

Pelo próprio celular, no site do GitHub: abra `config/busca.json`, toque no lápis (editar), mude os `termos` e salve (**Commit changes**). Vale na próxima coleta.

- `termos`: o que procurar. Ex.: `"coordenador e-commerce"`, `"marketplace"`.
- `fontes.linkedin`: `false` desliga o LinkedIn, se ele começar a bloquear.
- `empresas`: identificadores de páginas de carreira em Greenhouse, Lever, Ashby e InHire, para seguir empresas específicas (ver `docs/referencia.md`).

## Bom saber

- O LinkedIn às vezes bloqueia coletas vindas dos servidores do GitHub. Quando isso acontece, a Gupy continua funcionando e o rodapé da página mostra os avisos.
- O GitHub pausa agendamentos de repositórios sem nenhuma alteração por 60 dias e manda um e-mail avisando. Basta clicar em **Enable workflow** em Actions, ou editar qualquer arquivo de vez em quando.
- Para forçar uma coleta fora do horário: Actions → radar-celular → Run workflow.
