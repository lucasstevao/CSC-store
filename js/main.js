/* ============================================================
   CONFINAMENTO SANTA CECÍLIA — main.js
   ------------------------------------------------------------
   ÍNDICE:
   1. Navbar — efeito de scroll
   2. Reveal — animação de entrada ao rolar
   3. Menu mobile — hamburguer
   ============================================================ */


/* ============================================================
   1. NAVBAR — adiciona classe .scrolled ao rolar a página
   ============================================================ */
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 80);
});


/* ============================================================
   2. REVEAL — elementos aparecem com animação ao entrar na tela
      Basta adicionar a classe "reveal" a qualquer elemento HTML
      para que ele entre suavemente ao ser rolado.
   ============================================================ */
const reveals = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      // Delay escalonado para quando vários elementos aparecem juntos
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, i * 80);
      revealObserver.unobserve(entry.target); // para de observar após animar
    }
  });
}, { threshold: 0.1 });

reveals.forEach(el => revealObserver.observe(el));


/* ============================================================
   3. MENU MOBILE — abre/fecha o menu hamburguer
   ============================================================ */
function toggleMenu() {
  const links = document.querySelector('.nav-links');
  const isVisible = links.style.display === 'flex';

  if (isVisible) {
    links.style.display = 'none';
  } else {
    Object.assign(links.style, {
      display:         'flex',
      flexDirection:   'column',
      position:        'absolute',
      top:             '100%',
      left:            '0',
      right:           '0',
      background:      'rgba(20, 15, 10, 0.98)',
      padding:         '2rem',
      gap:             '1.5rem',
    });
  }
}

// Fecha o menu ao clicar em um link (mobile)
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth <= 1024) {
      document.querySelector('.nav-links').style.display = 'none';
    }
  });
});
