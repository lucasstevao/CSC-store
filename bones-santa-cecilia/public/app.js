// A interface está toda no index.html. Este arquivo só dá vida a ela (carrinho, frete, Pix, WhatsApp).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var loja, produtos = [], cart = {}, frete = null;
  var cents = function (v) { return Math.round(Number(v) * 100); };
  var money = function (c) { return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var dig = function (s) { return String(s || '').replace(/\D/g, ''); };
  var semAcento = function (s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };
  var prod = function (id) { return produtos.filter(function (p) { return p.id === id; })[0]; };
  function toast(t) { var e = $('toast'); e.textContent = t; e.classList.add('ver'); setTimeout(function () { e.classList.remove('ver'); }, 2000); }
  function modelo(id) { return $(id).content.firstElementChild.cloneNode(true); }
  function slot(el, nome) { return el.querySelector('[data-f=' + nome + ']'); }

  // ---------- Carrinho ----------
  try { cart = JSON.parse(localStorage.getItem('cart') || '{}'); } catch (e) { cart = {}; }
  function salvar() {
    try { localStorage.setItem('cart', JSON.stringify(cart)); } catch (e) {}
    frete = null;
    $('cont').textContent = Object.keys(cart).reduce(function (t, k) { return t + cart[k]; }, 0);
  }
  function maxQ(p) { return Math.min(p.estoque != null ? p.estoque : 10, 10); }
  function setQ(id, n) {
    var p = prod(id); if (!p) return;
    n = Math.max(0, Math.min(n, maxQ(p))); if (n) cart[id] = n; else delete cart[id]; salvar();
  }
  function linhas() { return Object.keys(cart).map(function (id) { return { p: prod(id), q: cart[id] }; }).filter(function (l) { return l.p; }); }
  function subtotal() { return linhas().reduce(function (t, l) { return t + cents(l.p.preco) * l.q; }, 0); }

  function resumo() {
    var sub = subtotal(), f = frete ? cents(frete.opt.preco) : null;
    document.querySelectorAll('[data-r]').forEach(function (e) {
      var k = e.dataset.r;
      e.textContent = k === 'prod' ? money(sub) : k === 'frete' ? (f === null ? 'calcule no carrinho' : money(f)) : money(sub + (f || 0));
    });
    $('btn-pagamento').disabled = !frete;
  }

  // ---------- Ações chamadas pelo HTML ----------
  window.trocarFoto = function (img) { img.closest('[data-id]').querySelector('.principal').src = img.src; };
  window.mudarQtd = function (b, d) { var o = b.parentNode.querySelector('output'); o.textContent = Math.max(1, Math.min(10, +o.textContent + d)); };
  window.adicionar = function (b, ir) {
    var s = b.closest('[data-id]'), id = s.dataset.id;
    setQ(id, (cart[id] || 0) + (+s.querySelector('output').textContent));
    if (ir) location.hash = '#/carrinho'; else toast('Adicionado ao carrinho');
  };
  window.mascaraCep = function (el) {
    var v = dig(el.value).slice(0, 8); el.value = v.length > 5 ? v.slice(0, 5) + '-' + v.slice(5) : v;
    frete = null; $('opcoes-frete').replaceChildren(); $('msg-frete').textContent = ''; resumo();
  };
  window.irPagamento = function () { if (frete) location.hash = '#/pagamento'; };

  window.calcularFrete = async function () {
    var c = dig($('cep').value), msg = $('msg-frete'), ops = $('opcoes-frete'), ls = linhas();
    msg.className = 'aviso-linha'; frete = null; ops.replaceChildren(); resumo();
    if (c.length !== 8) { msg.textContent = 'Digite um CEP com 8 números.'; msg.classList.add('erro'); return; }
    $('btn-frete').disabled = true; msg.textContent = 'Calculando frete...';
    try {
      var r = await fetch('/api/frete', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cep: c, itens: ls.map(function (l) { return { id: l.p.id, qtd: l.q }; }) }) });
      var d = await r.json(); if (!r.ok) throw new Error(d.erro || 'Não foi possível calcular o frete.');
      msg.textContent = 'Escolha a entrega:';
      d.opcoes.forEach(function (o) {
        var el = modelo('tpl-frete');
        slot(el, 'nome').textContent = (o.empresa ? o.empresa + ' ' : '') + o.servico + (o.prazo ? ' (até ' + o.prazo + ' dias úteis)' : '');
        slot(el, 'preco').textContent = money(cents(o.preco));
        el.querySelector('input').onchange = function () { frete = { cep: c, opt: o }; resumo(); };
        ops.appendChild(el);
      });
    } catch (e) { msg.textContent = (e.message || 'Erro') + ' Tente de novo ou fale conosco no WhatsApp.'; msg.classList.add('erro'); }
    $('btn-frete').disabled = false;
  };

  window.copiarPix = async function () {
    var t = $('pix-codigo'); t.select();
    try { await navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); }
    $('btn-copiar').textContent = 'Código copiado!';
    setTimeout(function () { $('btn-copiar').textContent = 'Copiar código Pix'; }, 2500);
  };

  window.finalizar = function () {
    var v = function (id) { return $(id).value.trim(); }, tel = dig(v('tel')), m = $('msg-final'); m.className = 'aviso-linha erro';
    if (!frete) { location.hash = '#/carrinho'; return; }
    if (v('nome').length < 5) { m.textContent = 'Informe seu nome completo.'; return; }
    if (tel.length < 10 || tel.length > 11) { m.textContent = 'Informe o telefone com DDD.'; return; }
    if (!v('rua') || !v('bairro') || !v('cidade') || v('uf').length !== 2) { m.textContent = 'Preencha rua, bairro, cidade e UF.'; return; }
    var sub = subtotal(), fc = cents(frete.opt.preco), o = frete.opt, d = new Date(), p2 = function (n) { return String(n).padStart(2, '0'); };
    var cod = 'SC-' + p2(d.getDate()) + p2(d.getMonth() + 1) + '-' + p2(d.getHours()) + p2(d.getMinutes()) + Math.floor(Math.random() * 90 + 10);
    var t = '📦 *PEDIDO - ' + loja.nome.toUpperCase() + '*\n🔖 Código: ' + cod + '\n\n📋 *Dados do pedido:*\n' +
      linhas().map(function (l) { return '- ' + l.q + 'x ' + l.p.nome + ' (' + money(cents(l.p.preco)) + ' cada)'; }).join('\n') +
      '\n- Produtos: ' + money(sub) + '\n- Frete (' + (o.empresa ? o.empresa + ' ' : '') + o.servico + '): ' + money(fc) +
      '\n- *TOTAL PAGO VIA PIX: ' + money(sub + fc) + '*\n\n👤 *Dados de entrega:*\n- Nome: ' + v('nome') + '\n- Telefone: ' + v('tel') +
      '\n- Endereço: ' + v('rua') + ', ' + v('bairro') + (v('compl') ? ' (' + v('compl') + ')' : '') +
      '\n- Cidade/UF - CEP: ' + v('cidade') + ' / ' + v('uf').toUpperCase() + ' - ' + frete.cep.slice(0, 5) + '-' + frete.cep.slice(5) +
      '\n\n⚠️ *Vou enviar o comprovante do Pix logo abaixo desta mensagem.*';
    m.className = 'aviso-linha'; m.textContent = 'Abrindo o WhatsApp... Anexe o comprovante e envie.';
    location.href = 'https://wa.me/' + loja.whatsapp + '?text=' + encodeURIComponent(t);
  };

  // ---------- Pix copia e cola ----------
  function tlv(id, v) { return id + String(v.length).padStart(2, '0') + v; }
  function crc16(s) {
    var c = 0xFFFF;
    for (var i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; }
    return c.toString(16).toUpperCase().padStart(4, '0');
  }
  function payloadPix(chave, nome, cidade, cent) {
    var n = semAcento(nome).toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 25) || 'LOJA';
    var c = semAcento(cidade).toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 15) || 'BRASIL';
    var p = tlv('00', '01') + tlv('01', '11') + tlv('26', tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', chave)) +
      tlv('52', '0000') + tlv('53', '986') + tlv('54', (cent / 100).toFixed(2)) + tlv('58', 'BR') +
      tlv('59', n) + tlv('60', c) + tlv('62', tlv('05', '***')) + '6304';
    return p + crc16(p);
  }

  // ---------- Telas ----------
  function telaCarrinho() {
    var lista = $('lista-itens'), ls = linhas(); lista.replaceChildren();
    $('carrinho-vazio').hidden = ls.length > 0; $('carrinho-cheio').hidden = !ls.length;
    $('opcoes-frete').replaceChildren(); $('msg-frete').textContent = '';
    ls.forEach(function (l) {
      var el = modelo('tpl-item'); el.dataset.id = l.p.id;
      var f = slot(el, 'foto'); f.src = l.p.imagem; f.onerror = function () { f.removeAttribute('src'); };
      slot(el, 'nome').textContent = l.p.nome; slot(el, 'preco').textContent = money(cents(l.p.preco)); slot(el, 'qtd').textContent = l.q;
      lista.appendChild(el);
    });
    resumo();
  }
  $('lista-itens').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-acao]'); if (!b) return;
    var id = b.closest('.item').dataset.id, a = b.dataset.acao;
    setQ(id, a === 'remover' ? 0 : cart[id] + (a === 'mais' ? 1 : -1)); telaCarrinho();
  });
  function telaPagamento() {
    var sub = subtotal(), cod = payloadPix(loja.pix_chave, loja.pix_nome, loja.pix_cidade, sub + cents(frete.opt.preco));
    var qr = qrcode(0, 'M'); qr.addData(cod); qr.make();
    $('qr').src = qr.createDataURL(5, 8); $('pix-codigo').value = cod; resumo();
    fetch('https://viacep.com.br/ws/' + frete.cep + '/json/').then(function (r) { return r.json(); }).then(function (d) {
      if (d.erro) return;
      if (!$('rua').value) $('rua').value = d.logradouro || ''; if (!$('bairro').value) $('bairro').value = d.bairro || '';
      $('cidade').value = d.localidade || ''; $('uf').value = d.uf || '';
    }).catch(function () {});
  }

  function rota() {
    var r = (location.hash || '#/').split('/'), t = r[1] || 'home', alvo;
    if (t === 'pagamento' && (!frete || !linhas().length)) { location.hash = '#/carrinho'; return; }
    document.querySelectorAll('.tela').forEach(function (s) { s.classList.remove('ativa'); });
    alvo = t === 'produto' ? document.querySelector('.tela[data-tela=produto][data-id="' + r[2] + '"]') : document.querySelector('.tela[data-tela=' + t + ']');
    if (!alvo) alvo = document.querySelector('.tela[data-tela=home]');
    alvo.classList.add('ativa'); window.scrollTo(0, 0);
    if (t === 'carrinho') telaCarrinho(); else if (t === 'pagamento') telaPagamento();
  }
  window.addEventListener('hashchange', rota);

  // ---------- Início: lê preços e estoque do loja.json ----------
  fetch('loja.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (c) {
    loja = c.loja; produtos = c.produtos.filter(function (p) { return p.ativo; });
    document.querySelectorAll('[data-preco]').forEach(function (e) { var p = prod(e.dataset.preco); e.textContent = p ? money(cents(p.preco)) : ''; });
    document.querySelectorAll('.tela[data-tela=produto]').forEach(function (s) {
      var p = prod(s.dataset.id);
      if (!p || p.estoque === 0) s.querySelectorAll('[data-comprar]').forEach(function (b) { b.disabled = true; b.textContent = 'Esgotado'; });
    });
    Object.keys(cart).forEach(function (id) { if (!prod(id)) delete cart[id]; }); salvar(); rota();
  }).catch(function () { document.querySelector('main').textContent = 'Não foi possível carregar a loja. Recarregue a página.'; });
})();
