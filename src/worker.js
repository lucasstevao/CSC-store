const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/frete') return json({ erro: 'Não encontrado' }, 404);
    if (request.method !== 'POST') return json({ erro: 'Método não permitido' }, 405);
    if (!env.ME_TOKEN) return json({ erro: 'Frete indisponível.', detalhe: 'ME_TOKEN não está configurado na Cloudflare' }, 500);

    let body;
    try { body = await request.json(); } catch { return json({ erro: 'Requisição inválida' }, 400); }

    const cep = String(body.cep || '').replace(/\D/g, '');
    if (cep.length !== 8) return json({ erro: 'CEP inválido' }, 400);

    const res = await env.ASSETS.fetch(new URL('/loja.json', request.url));
    const catalogo = (await res.json()).produtos;

    const itens = Array.isArray(body.itens) ? body.itens.slice(0, 20) : [];
    const products = [];
    for (const it of itens) {
      const p = catalogo.find(x => x.id === it.id && x.ativo);
      const qtd = Math.min(Math.max(parseInt(it.qtd) || 0, 0), 50);
      if (!p || !qtd) continue;
      products.push({
        id: p.id, quantity: qtd, insurance_value: p.preco,
        weight: p.peso_kg, length: p.comprimento_cm, width: p.largura_cm, height: p.altura_cm
      });
    }
    if (!products.length) return json({ erro: 'Nenhum produto selecionado' }, 400);

    try {
      const r = await fetch(`${env.ME_BASE}/api/v2/me/shipment/calculate`, {
        method: 'POST',
        headers: {
          Accept: 'application/json', 'Content-Type': 'application/json',
          Authorization: `Bearer ${env.ME_TOKEN}`,
          'User-Agent': `Loja Santa Cecilia (${env.CONTACT_EMAIL})`
        },
        body: JSON.stringify({ from: { postal_code: env.CEP_ORIGEM }, to: { postal_code: cep }, products })
      });
      if (!r.ok) {
        let detalhe = '';
        try { detalhe = (await r.text()).slice(0, 300); } catch {}
        return json({ erro: 'Não foi possível calcular o frete agora.', status_melhor_envio: r.status, detalhe }, 502);
      }
      const dados = await r.json();
      const opcoes = (Array.isArray(dados) ? dados : [])
        .filter(s => !s.error && (s.custom_price || s.price))
        .map(s => ({
          servico: s.name, empresa: s.company && s.company.name,
          preco: Number(s.custom_price ?? s.price),
          prazo: s.custom_delivery_time ?? s.delivery_time
        }))
        .sort((a, b) => a.preco - b.preco);
      if (!opcoes.length) return json({ erro: 'Nenhuma entrega disponível para este CEP.' }, 404);
      return json({ opcoes });
    } catch {
      return json({ erro: 'Serviço de frete indisponível.' }, 502);
    }
  }
};
