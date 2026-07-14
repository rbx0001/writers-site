/**
 * WRITERS — $WRTRS
 * Main JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {

  // ======== Mobile Nav Toggle ========
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });

    // Close on link click
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
        showToast('CA copied! 📋');
      } catch {
        // Fallback
        const range = document.createRange();
        range.selectNode(caEl);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        showToast('CA copied! 📋');
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

  // ======== Scroll Fade-in Animations ========
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all token cards, roadmap phases, merch cards, community cards
  document.querySelectorAll('.token-card, .roadmap-phase, .merch-card, .community-card, .newsletter').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
  });

  // ======== Newsletter Form ========
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector('input[type="email"]');
      if (input && input.value) {
        showToast('Thanks, writer! 📬 We\'ll be in touch.');
        input.value = '';
      }
    });
  }

  // ======== Graffiti Canvas Background ========
  const canvas = document.createElement('canvas');
  const wrapper = document.getElementById('graffitiCanvas');
  if (wrapper) {
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    wrapper.appendChild(canvas);

    // Spray paint effect
    const spray = (x, y, color, radius, density) => {
      for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        const dx = x + Math.cos(angle) * r;
        const dy = y + Math.sin(angle) * r;
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.random() * 0.15;
        ctx.beginPath();
        ctx.arc(dx, dy, Math.random() * 2 + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Generate some graffiti tags
    const colors = ['#ff6b35', '#ffd700', '#00ffc8', '#9b59b6', '#e74c3c', '#3498db', '#2ecc71'];
    const w = canvas.width;
    const h = canvas.height;

    // Spray clusters
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const radius = 20 + Math.random() * 60;
      spray(x, y, color, radius, 60 + Math.random() * 80);
    }

    // Some drips
    for (let i = 0; i < 8; i++) {
      const x = 50 + Math.random() * (w - 100);
      const startY = 20 + Math.random() * (h * 0.4);
      const length = 30 + Math.random() * 100;
      const color = colors[Math.floor(Math.random() * colors.length)];

      for (let j = 0; j < length; j += 2) {
        const alpha = 0.1 - (j / length) * 0.08;
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.max(alpha, 0.01);
        ctx.fillRect(x, startY + j, 2 + Math.random() * 2, 3);
      }
    }

    ctx.globalAlpha = 1;
  }

  // ======== Navbar border on scroll ========
  const navbar = document.getElementById('navbar');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll > 50) {
      navbar.style.borderBottomColor = 'rgba(255, 107, 53, 0.25)';
    } else {
      navbar.style.borderBottomColor = 'rgba(255, 107, 53, 0.15)';
    }
    lastScroll = currentScroll;
  });

  // ======== Resize handler for canvas ========
  window.addEventListener('resize', () => {
    if (canvas && wrapper) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  });
});
