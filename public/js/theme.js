// Theme Manager for Simple IoT World
(function () {
  const THEME_KEY = 'simple_iot_theme';

  function applyTheme(theme) {
    const html = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');

    if (theme === 'dark') {
      html.classList.add('dark');
      if (themeIcon) {
        // Show Sun icon (indicates click to switch to light mode)
        themeIcon.innerHTML = `
          <svg class="w-5 h-5 text-yellow-400 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        `;
      }
      if (themeText) themeText.textContent = 'Light Mode';
    } else {
      html.classList.remove('dark');
      if (themeIcon) {
        // Show Moon icon (indicates click to switch to dark mode)
        themeIcon.innerHTML = `
          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        `;
      }
      if (themeText) themeText.textContent = 'Dark Mode';
    }

    localStorage.setItem(THEME_KEY, theme);
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      applyTheme(saved);
    } else {
      // Default to dark mode for stunning IoT aesthetics, or match system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }
  }

  // Toggle Function
  window.toggleTheme = function () {
    const isDark = document.documentElement.classList.contains('dark');
    applyTheme(isDark ? 'light' : 'dark');
  };

  // Run on initial script evaluation
  initTheme();

  // Run when DOM is ready to attach listeners
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.addEventListener('click', window.toggleTheme);
    }
  });
})();
