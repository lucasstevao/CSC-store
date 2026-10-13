(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var app = $('app'), loja, produtos = [], cart = {}, frete = null;

  var cents = function (v) { return Math.round(Number(v) * 100); };
  var money = function (c) { return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var dig = function (s) { return String(s || '').replace(/\D/g, ''); };
  var semAcento = function (s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };
  function h(tag, a) {
    var e = document.createElement(tag); a = a || {};
    for (var k in a) { var v = a[k];
      if (k === 'class') e.className = v; else if (k.slice(0, 2) === 'on') e[k] = v;
      else if (v !== false && v != null) e.setAttribute(k, v); }
    for (var i = 2; i < arguments.length; i++) [].concat(arguments[i]).forEach(function (c) { e.append(c == null || c === false ? '' : c); });
    return e;
  }
  function foto(src, alt, cls) {
    var i = h('img', { class: cls || 'foto', src: src, alt: alt || '', loading: 'lazy' });
    i.onerror = function () { i.removeAttribute('src'); }; return i;
  }
  function toast(t) { var e = $('toast'); e.textContent = t; e.classList.add('ver'); setTimeout(function () { e.classList.remove('ver'); }, 2000); }

  // ---------- Carrinho ----------
  try { cart = JSON.parse(localStorage.getItem('cart') || '{}'); } catch (e) { cart = {}; }
  function salvar() { try { localStorage.setItem('cart', JSON.stringify(cart)); } catch (e) {} frete = null;
    $('cont').textContent = Object.keys(cart).reduce(function (t, k) { return t + cart[k]; }, 0); }
  function prod(id) { return produtos.filter(function (p) { return p.id === id; })[0]; }
  function maxQ(p) { return Math.min(p.estoque != null ? p.estoque : 10, 10); }
  function setQ(id, n) { var p = prod(id); if (!p) return; n = Math.max(0, Math.min(n, maxQ(p))); if (n) cart[id] = n; else delete cart[id]; salvar(); }
  function linhas() { return Object.keys(cart).map(function (id) { return { p: prod(id), q: cart[id] }; }).filter(function (l) { return l.p; }); }
  function subtotal() { return linhas().reduce(function (t, l) { return t + cents(l.p.preco) * l.q; }, 0); }

  // ---------- Pix copia e cola ----------
  function tlv(id, v) { return id + String(v.length).padStart(2, '0') + v; }
  function crc16(s) { var c = 0xFFFF;
    for (var i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; }
    return c.toString(16).toUpperCase().padStart(4, '0'); }
  function payloadPix(chave, nome, cidade, cent) {
    var n = semAcento(nome).toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 25) || 'LOJA';
    var c = semAcento(cidade).toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 15) || 'BRASIL';
    var p = tlv('00', '01') + tlv('01', '11') + tlv('26', tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', chave)) +
      tlv('52', '0000') + tlv('53', '986') + tlv('54', (cent / 100).toFixed(2)) + tlv('58', 'BR') +
      tlv('59', n) + tlv('60', c) + tlv('62', tlv('05', '***')) + '6304';
    return p + crc16(p);
  }

  // ---------- Telas ----------
  function home() {
    document.title = 'Loja Oficial | ' + loja.nome;
    return h('div', null,
      h('section', { class: 'banner' }, h('h1', null, 'Loja oficial do Confinamento Santa Cecília'), h('p', null, 'Produtos feitos para quem vive o campo. Pague com Pix e receba em casa.')),
      h('div', { class: 'grade' }, produtos.map(function (p) {
        var esg = p.estoque === 0;
        return h('a', { class: 'card', href: '#/produto/' + p.id }, foto((p.imagens || [p.imagem])[0], p.nome),
          h('div', null, h('h3', null, p.nome), h('div', { class: 'preco' }, money(cents(p.preco))), esg && h('span', { class: 'tag' }, 'Esgotado')));
      })));
  }

  function telaProduto(id) {
    var p = prod(id); if (!p) return h('p', null, 'Produto não encontrado. ', h('a', { href: '#/' }, 'Voltar à loja'));
    document.title = p.nome + ' | ' + loja.nome;
    var imgs = p.imagens || [p.imagem], q = 1, esg = p.estoque === 0;
    var principal = foto(imgs[0], p.nome), out = h('output', null, '1');
    var mini = h('div', { class: 'mini' }, imgs.length > 1 && imgs.map(function (s, i) {
      var b = h('button', { type: 'button', 'aria-label': 'Foto ' + (i + 1), 'aria-current': i === 0 }, foto(s, ''));
      b.onclick = function () { principal.src = s; [].forEach.call(mini.children, function (x) { x.setAttribute('aria-current', x === b); }); }; return b; }));
    function add() { setQ(id, (cart[id] || 0) + q); }
    var bAdd = h('button', { class: 'prim', type: 'button', disabled: esg, onclick: function () { add(); toast('Adicionado ao carrinho'); } }, esg ? 'Esgotado' : 'Adicionar ao carrinho');
    var bJa = h('button', { class: 'cont', type: 'button', disabled: esg, onclick: function () { add(); location.hash = '#/carrinho'; } }, 'Comprar agora');
    return h('div', null, h('p', { class: 'migalha' }, h('a', { href: '#/' }, 'Loja'), ' / ', p.nome),
      h('div', { class: 'prod' }, h('div', null, principal, mini),
        h('div', { class: 'info' }, h('h1', null, p.nome), h('div', { class: 'preco' }, money(cents(p.preco))),
          h('p', null, p.descricao), h('p', { class: 'peq' }, 'Pagamento por Pix. O frete é calculado no carrinho.'),
          h('div', { class: 'qtd' }, h('button', { type: 'button', 'aria-label': 'Diminuir', onclick: function () { q = Math.max(1, q - 1); out.textContent = q; } }, '−'), out,
            h('button', { type: 'button', 'aria-label': 'Aumentar', onclick: function () { q = Math.min(maxQ(p), q + 1); out.textContent = q; } }, '+')),
          h('p', null, bAdd), bJa)));
  }

  function resumo(f) {
    var sub = subtotal(), fr = f ? cents(f.preco) : null;
    return h('div', { class: 'caixa resumo' }, h('h2', null, 'Resumo'),
      h('div', null, h('span', null, 'Produtos'), h('span', null, money(sub))),
      h('div', null, h('span', null, 'Frete'), h('span', null, fr === null ? 'calcule ao lado' : money(fr))),
      h('div', { class: 'total' }, h('span', null, 'Total'), h('span', null, money(sub + (fr || 0)))));
  }

  function telaCarrinho() {
    document.title = 'Carrinho | ' + loja.nome;
    var ls = linhas();
    if (!ls.length) return h('div', null, h('h1', null, 'Seu carrinho está vazio'), h('p', null, h('a', { href: '#/' }, 'Ver produtos')));
    var msg = h('p', { class: 'aviso-linha', role: 'status' }), ops = h('div'), cep = h('input', { id: 'cep', inputmode: 'numeric', maxlength: '9', placeholder: '00000-000', autocomplete: 'postal-code' });
    var lateral = h('div'), btnFrete = h('button', { class: 'sec', type: 'button' }, 'Calcular frete'), ir = h('button', { class: 'prim', type: 'button', disabled: true, onclick: function () { location.hash = '#/pagamento'; } }, 'Continuar para o pagamento');
    function lat() { lateral.replaceChildren(resumo(frete && frete.opt), h('p', null, ir)); ir.disabled = !frete; }
    cep.oninput = function () { var v = dig(cep.value).slice(0, 8); cep.value = v.length > 5 ? v.slice(0, 5) + '-' + v.slice(5) : v; frete = null; ops.replaceChildren(); msg.textContent = ''; lat(); };
    btnFrete.onclick = async function () {
      var c = dig(cep.value); msg.className = 'aviso-linha'; frete = null; ops.replaceChildren(); lat();
      if (c.length !== 8) { msg.textContent = 'Digite um CEP com 8 números.'; msg.classList.add('erro'); return; }
      btnFrete.disabled = true; msg.textContent = 'Calculando frete...';
      try {
        var r = await fetch('/api/frete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cep: c, itens: ls.map(function (l) { return { id: l.p.id, qtd: l.q }; }) }) });
        var d = await r.json(); if (!r.ok) throw new Error(d.erro || 'Não foi possível calcular o frete.');
        msg.textContent = 'Escolha a entrega:';
        d.opcoes.forEach(function (o) {
          var rd = h('input', { type: 'radio', name: 'frete' }); rd.onchange = function () { frete = { cep: c, opt: o }; lat(); };
          ops.append(h('label', { class: 'opcao' }, rd, h('span', null, (o.empresa ? o.empresa + ' ' : '') + o.servico + (o.prazo ? ' (até ' + o.prazo + ' dias úteis)' : '')), h('b', null, money(cents(o.preco)))));
        });
      } catch (e) { msg.textContent = (e.message || 'Erro') + ' Tente de novo ou fale conosco no WhatsApp.'; msg.classList.add('erro'); }
      btnFrete.disabled = false;
    };
    lat();
    return h('div', null, h('h1', null, 'Carrinho'), h('div', { class: 'dois' },
      h('div', null, h('div', { class: 'caixa' }, ls.map(function (l) {
        var o = h('output', null, l.q);
        return h('div', { class: 'item' }, foto((l.p.imagens || [l.p.imagem])[0], l.p.nome),
          h('div', null, h('h3', null, l.p.nome), h('div', { class: 'preco' }, money(cents(l.p.preco))),
            h('button', { class: 'x', type: 'button', onclick: function () { setQ(l.p.id, 0); route(); } }, 'Remover')),
          h('div', { class: 'qtd' }, h('button', { type: 'button', 'aria-label': 'Diminuir', onclick: function () { setQ(l.p.id, l.q - 1); route(); } }, '−'), o,
            h('button', { type: 'button', 'aria-label': 'Aumentar', onclick: function () { setQ(l.p.id, l.q + 1); route(); } }, '+')));
      })),
        h('div', { class: 'caixa', style: 'margin-top:1rem' }, h('h2', null, 'Calcular frete'), h('label', null, 'CEP de entrega', h('div', { class: 'linha' }, cep, btnFrete)), msg, ops),
        h('p', null, h('a', { href: '#/' }, 'Continuar comprando'))), lateral));
  }

  function telaPagamento() {
    if (!frete || !linhas().length) { location.hash = '#/carrinho'; return h('div'); }
    document.title = 'Pagamento | ' + loja.nome;
    var sub = subtotal(), fc = cents(frete.opt.preco), tot = sub + fc;
    var codigo = payloadPix(loja.pix_chave, loja.pix_nome, loja.pix_cidade, tot), qr = qrcode(0, 'M'); qr.addData(codigo); qr.make();
    var campo = function (id, rot, extra) { return h('label', null, rot, h('input', Object.assign({ id: id }, extra || {}))); };
    var msg = h('p', { class: 'aviso-linha', role: 'status' }), ta = h('textarea', { readonly: true, rows: '4' }); ta.value = codigo;
    var cp = h('button', { class: 'sec', type: 'button' }, 'Copiar código Pix');
    cp.onclick = async function () { ta.select(); try { await navigator.clipboard.writeText(codigo); } catch (e) { document.execCommand('copy'); } cp.textContent = 'Código copiado!'; setTimeout(function () { cp.textContent = 'Copiar código Pix'; }, 2500); };
    var fin = h('button', { class: 'prim', type: 'button' }, 'Finalizar pedido e enviar no WhatsApp');
    fin.onclick = function () {
      var v = function (id) { return $(id).value.trim(); }, tel = dig(v('tel')); msg.className = 'aviso-linha erro';
      if (v('nome').length < 5) { msg.textContent = 'Informe seu nome completo.'; return; }
      if (tel.length < 10 || tel.length > 11) { msg.textContent = 'Informe o telefone com DDD.'; return; }
      if (!v('rua') || !v('bairro') || !v('cidade') || v('uf').length !== 2) { msg.textContent = 'Preencha rua, bairro, cidade e UF.'; return; }
      var d = new Date(), p2 = function (n) { return String(n).padStart(2, '0'); };
      var cod = 'SC-' + p2(d.getDate()) + p2(d.getMonth() + 1) + '-' + p2(d.getHours()) + p2(d.getMinutes()) + Math.floor(Math.random() * 90 + 10), o = frete.opt;
      var t = '📦 *PEDIDO - ' + loja.nome.toUpperCase() + '*\n🔖 Código: ' + cod + '\n\n📋 *Dados do pedido:*\n' +
        linhas().map(function (l) { return '- ' + l.q + 'x ' + l.p.nome + ' (' + money(cents(l.p.preco)) + ' cada)'; }).join('\n') +
        '\n- Produtos: ' + money(sub) + '\n- Frete (' + (o.empresa ? o.empresa + ' ' : '') + o.servico + '): ' + money(fc) +
        '\n- *TOTAL PAGO VIA PIX: ' + money(tot) + '*\n\n👤 *Dados de entrega:*\n- Nome: ' + v('nome') + '\n- Telefone: ' + v('tel') +
        '\n- Endereço: ' + v('rua') + ', ' + v('bairro') + (v('compl') ? ' (' + v('compl') + ')' : '') + '\n- Cidade/UF - CEP: ' + v('cidade') + ' / ' + v('uf').toUpperCase() +
        ' - ' + frete.cep.slice(0, 5) + '-' + frete.cep.slice(5) + '\n\n⚠️ *Vou enviar o comprovante do Pix logo abaixo desta mensagem.*';
      msg.className = 'aviso-linha'; msg.textContent = 'Abrindo o WhatsApp... Anexe o comprovante e envie.';
      location.href = 'https://wa.me/' + loja.whatsapp + '?text=' + encodeURIComponent(t);
    };
    fetch('https://viacep.com.br/ws/' + frete.cep + '/json/').then(function (r) { return r.json(); }).then(function (d) {
      if (d.erro) return; $('rua').value = d.logradouro || ''; $('bairro').value = d.bairro || ''; $('cidade').value = d.localidade || ''; $('uf').value = d.uf || '';
    }).catch(function () {});
    return h('div', null, h('h1', null, 'Pagamento'), h('div', { class: 'dois' }, h('div', null,
      h('div', { class: 'caixa' }, h('h2', null, '1. Dados de entrega'), campo('nome', 'Nome completo', { autocomplete: 'name' }),
        campo('tel', 'Telefone com DDD', { inputmode: 'tel', autocomplete: 'tel', placeholder: '(17) 99999-9999' }),
        campo('rua', 'Rua e número'), campo('bairro', 'Bairro'), campo('compl', 'Complemento (opcional)'),
        h('div', { class: 'duas' }, campo('cidade', 'Cidade'), campo('uf', 'UF', { maxlength: '2' }))),
      h('div', { class: 'caixa pix', style: 'margin-top:1rem' }, h('h2', null, '2. Pague com Pix'), h('img', { src: qr.createDataURL(5, 8), alt: 'QR Code do Pix', width: '200', height: '200' }),
        h('p', { class: 'peq' }, 'Ou use o Pix copia e cola, já com o valor do pedido:'), ta, cp)),
      h('div', null, resumo(frete.opt), h('div', { class: 'alerta' }, 'Atenção: sua compra só será processada e enviada depois que você enviar o comprovante do Pix no WhatsApp que vai abrir.'),
        fin, msg, h('p', null, h('a', { href: '#/carrinho' }, 'Voltar ao carrinho')))));
  }

  // ---------- Rotas ----------
  function route() {
    var r = (location.hash || '#/').split('/'), v;
    if (r[1] === 'produto') v = telaProduto(r[2]); else if (r[1] === 'carrinho') v = telaCarrinho();
    else if (r[1] === 'pagamento') v = telaPagamento(); else v = home();
    app.replaceChildren(v); window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  fetch('loja.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (c) {
    loja = c.loja; produtos = c.produtos.filter(function (p) { return p.ativo; });
    Object.keys(cart).forEach(function (id) { if (!prod(id)) delete cart[id]; }); salvar(); route();
  }).catch(function () { app.textContent = 'Não foi possível carregar a loja. Recarregue a página.'; });
})();
