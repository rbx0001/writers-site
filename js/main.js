/**
 * WRITERS — $WRTRS
 * Main JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {

  // Signal to the inline head-script safety net that JS initialised.
  window.__writersReady = true;

  // ======== Boot-ish reveal ========
  requestAnimationFrame(() => document.body.classList.add('loaded'));

  // ======== Mobile Nav Toggle ========
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
      });
    });
  }

  // ======== Copy Contract Address ========
  const copyBtn = document.getElementById('copyCa');
  const caEl = document.getElementById('caAddress');

  if (copyBtn && caEl) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(caEl.textContent.trim());
        showToast('CA copied');
      } catch {
        const range = document.createRange();
        range.selectNode(caEl);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        showToast('CA copied');
      }
    });
  }

  function showToast(msg) {
    const existing = document.querySelector('.copy-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'copy-toast show';
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // ======== Scroll Reveals ========
  const revealTargets = document.querySelectorAll('[data-reveal], .fade-in');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce || !('IntersectionObserver' in window)) {
    revealTargets.forEach(el => el.classList.add('in', 'visible'));
  } else {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in', 'visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealTargets.forEach(el => observer.observe(el));
  }

  // ======== Navbar state on scroll ========
  const navbar = document.getElementById('navbar');
  let ticking = false;

  const setNavState = () => {
    if (!navbar) return;
    navbar.classList.toggle('scrolled', window.scrollY > 40);
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(setNavState);
    }
  }, { passive: true });
  setNavState();

  // ======== Graffiti Canvas Background ========
  const canvas = document.createElement('canvas');
  const wrapper = document.getElementById('graffitiCanvas');

  if (wrapper) {
    const ctx = canvas.getContext('2d');
    wrapper.appendChild(canvas);

    const colors = ['#ff4d12', '#ff7a3d', '#ece7dd', '#ff4d12'];

    const spray = (x, y, color, radius, density, alphaCap) => {
      for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2;
        const rr = Math.pow(Math.random(), 0.6) * radius;
        const dx = x + Math.cos(angle) * rr;
        const dy = y + Math.sin(angle) * rr;
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.random() * alphaCap;
        ctx.beginPath();
        ctx.arc(dx, dy, Math.random() * 1.8 + 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = wrapper.clientWidth || window.innerWidth;
      const h = wrapper.clientHeight || window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Edge-weighted spray clusters — keep the centre clear for the headline.
      const clusters = [
        [0.06, 0.24], [0.14, 0.72], [0.9, 0.2], [0.82, 0.78],
        [0.3, 0.92], [0.68, 0.08], [0.98, 0.52], [0.02, 0.5]
      ];
      clusters.forEach(([cx, cy], i) => {
        const color = colors[i % colors.length];
        spray(cx * w, cy * h, color, 26 + Math.random() * 54, 70 + Math.random() * 70, 0.09);
      });

      // Hairline drips from the top edge.
      for (let i = 0; i < 7; i++) {
        const x = 30 + Math.random() * (w - 60);
        const startY = Math.random() * (h * 0.18);
        const length = 40 + Math.random() * 120;
        const color = colors[i % colors.length];
        for (let j = 0; j < length; j += 2) {
          const alpha = 0.07 - (j / length) * 0.06;
          ctx.fillStyle = color;
          ctx.globalAlpha = Math.max(alpha, 0.008);
          ctx.fillRect(x, startY + j, 1 + Math.random() * 1.6, 3);
        }
      }

      ctx.globalAlpha = 1;
    };

    render();

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 200);
    });
  }
});
