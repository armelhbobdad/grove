// Grove site — shared scripts

// Light theme only — force-clear any previously persisted dark mode.
document.documentElement.removeAttribute('data-theme');
try { localStorage.removeItem('grove-theme'); } catch (_) {}

// Scroll reveal
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-animate]').forEach((el) => el.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in-view');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );
    document.querySelectorAll('[data-animate]').forEach((el) => io.observe(el));
  });
})();

// Active nav link from current path
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const slug = path.replace('.html', '') || 'index';
    document.querySelectorAll('.nav-links a[data-page]').forEach((a) => {
      if (a.dataset.page === slug) a.classList.add('active');
    });
  });
})();
