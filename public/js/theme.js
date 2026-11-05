(() => {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');

  if (!reducedMotion.matches && finePointer.matches) {
    let x = window.innerWidth / 2;
    let y = window.innerHeight * 0.45;
    let targetX = x;
    let targetY = y;
    let animationFrame = 0;

    function animateBackground() {
      x += (targetX - x) * 0.12;
      y += (targetY - y) * 0.12;

      root.style.setProperty('--pointer-x', `${x}px`);
      root.style.setProperty('--pointer-y', `${y}px`);
      root.style.setProperty('--study-shift-x', `${(window.innerWidth / 2 - x) * 0.025}px`);
      root.style.setProperty('--study-shift-y', `${(window.innerHeight * 0.45 - y) * 0.025}px`);

      if (Math.abs(targetX - x) > 0.2 || Math.abs(targetY - y) > 0.2) {
        animationFrame = window.requestAnimationFrame(animateBackground);
      } else {
        animationFrame = 0;
      }
    }

    function moveBackground(event) {
      if (event.pointerType === 'touch') return;
      targetX = event.clientX;
      targetY = event.clientY;

      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(animateBackground);
      }
    }

    window.addEventListener('pointermove', moveBackground, { passive: true });
    window.addEventListener('pointerleave', () => {
      targetX = window.innerWidth / 2;
      targetY = window.innerHeight * 0.45;
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(animateBackground);
      }
    }, { passive: true });
  }

  const toggle = document.querySelector('[data-theme-toggle]');
  if (!toggle) return;

  const icon = toggle.querySelector('[data-theme-icon]');
  const label = toggle.querySelector('[data-theme-label]');

  function updateToggle(theme) {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const isDark = theme === 'dark';
    toggle.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
    toggle.setAttribute('aria-pressed', String(!isDark));
    icon.textContent = isDark ? '☀' : '☾';
    label.textContent = isDark ? 'Light' : 'Dark';
  }

  const initialTheme = root.dataset.theme === 'light' ? 'light' : 'dark';
  updateToggle(initialTheme);

  toggle.addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = nextTheme;
    updateToggle(nextTheme);
    try {
      localStorage.setItem('eduverse-theme', nextTheme);
    } catch (error) {
      console.warn('Theme preference could not be saved in this browser.', error);
    }
  });
})();
