# Loja de bonés | Confinamento Santa Cecília

- `public/loja.json`: preços, estoque (campo opcional "estoque"; 0 = esgotado), produtos, WhatsApp e Pix (edite aqui, nada mais).
- `public/img/bone.jpg` e `public/img/logo.png`: suas imagens.
- `src/worker.js`: cálculo de frete (não precisa mexer).
- `wrangler.toml`: CEP de origem e e-mail de contato.
- Segredo `ME_TOKEN` (token do Melhor Envio): cadastrar só no painel da Cloudflare, nunca no GitHub.
