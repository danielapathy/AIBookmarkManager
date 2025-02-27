import { showStatus } from '../utils/helpers.js';

export default class ThemeManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.loadTheme();
    this.setupListeners();

    // Initialize slider backgrounds when DOM is ready.
    document.addEventListener('DOMContentLoaded', () => {
      this.updateAllSliders();
    });

    // Listen for input events on any range input (even if added later)
    document.addEventListener('input', (e) => {
      if (e.target.matches('input[type="range"]')) {
        this.updateSliderBackground(e.target);
      }
    });
  }

  loadTheme() {
    chrome.storage.sync.get(['theme'], (result) => {
      const theme = result.theme || {
        mode: 'light',
        color: 'default'
      };
      this.applyTheme(theme);
    });
  }

  setupListeners() {
    document.getElementById('themeBtn').addEventListener('click', () => {
      this.uiManager.navigateToPage('themePage');
    });

    document.querySelectorAll('.theme-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.saveTheme();
      });
    });

    document.querySelectorAll('.theme-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.saveTheme();
      });
    });
  }

  // Returns a valid gradient for the filled portion.
  // If --primary-color is already a gradient, use it; otherwise wrap the color.
  getPrimaryFill() {
    const rootStyles = getComputedStyle(document.documentElement);
    let primaryColor = rootStyles.getPropertyValue('--primary-color').trim();
    if (!primaryColor) {
      primaryColor = '#6366f1';
    }
    if (!primaryColor.includes('gradient')) {
      primaryColor = `linear-gradient(to right, ${primaryColor} 0%, ${primaryColor} 100%)`;
    }
    return primaryColor;
  }

  // Update a single slider’s background based on its value.
  updateSliderBackground(slider) {
    const min = slider.min ? parseFloat(slider.min) : 0;
    const max = slider.max ? parseFloat(slider.max) : 100;
    const val = parseFloat(slider.value);
    const percentage = ((val - min) / (max - min)) * 100;
    const fill = this.getPrimaryFill();

    // Set the base (unfilled) track color
    slider.style.backgroundColor = '#ccc';
    slider.style.backgroundImage = fill;
    slider.style.backgroundRepeat = 'no-repeat';
    slider.style.backgroundSize = `${percentage}% 100%`;
  }

  // Update all range inputs on the page.
  updateAllSliders() {
    document.querySelectorAll('input[type="range"]').forEach(slider => {
      this.updateSliderBackground(slider);
    });
  }

  saveTheme() {
    const theme = {
      mode: document.querySelector('.theme-mode-btn.active').id === 'darkMode' ? 'dark' : 'light',
      color: document.querySelector('.theme-option.active').dataset.theme
    };

    chrome.storage.sync.set({ theme }, () => {
      this.applyTheme(theme);
      showStatus('Theme saved successfully!', 'success');
    });
  }
  
  forceThemeRefresh() {
      // Temporarily remove the theme attribute
      const html = document.documentElement;
      const currentTheme = html.getAttribute('data-theme');

      html.removeAttribute('data-theme');

      // Force a browser reflow
      void html.offsetHeight;

      // Reapply the theme and refresh sliders
      html.setAttribute('data-theme', currentTheme);
      this.updateAllSliders();
    }

  applyTheme(theme) {
    // Apply dark/light mode
    document.documentElement.setAttribute('data-theme', theme.mode);

    // Apply the selected color theme.
    const primaryColor = this.getThemeColor(theme.color);
    document.documentElement.style.setProperty('--primary-color', primaryColor);

    // Update the active state for the UI buttons.
    document.querySelectorAll('.theme-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.id === `${theme.mode}Mode`);
    });
    document.querySelectorAll('.theme-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme.color);
    });

    // When the primary color changes, update all sliders.
    this.updateAllSliders();
  }

  getThemeColor(theme) {
    const colors = {
      default: { primary: '#2563eb', hover: '#1d4ed8' },
      green:   { primary: '#059669', hover: '#047857' },
      purple:  { primary: '#7c3aed', hover: '#6d28d9' },
      orange:  { primary: '#ea580c', hover: '#c2410c' },
      teal:    { primary: '#0d9488', hover: '#0f766e' },
      rose:    { primary: '#e11d48', hover: '#be123c' },
      amber:   { primary: '#d97706', hover: '#b45309' },
      indigo:  { primary: '#4338ca', hover: '#3730a3' },
      pink:    { primary: '#db2777', hover: '#be185d' },
      // Gradient themes:
      sunset:  { primary: 'linear-gradient(45deg, #f97316, #db2777)', hover: 'linear-gradient(45deg, #ea580c, #be185d)' },
      ocean:   { primary: 'linear-gradient(45deg, #0ea5e9, #2dd4bf)', hover: 'linear-gradient(45deg, #0284c7, #14b8a6)' },
      aurora:  { primary: 'linear-gradient(45deg, #6366f1, #a855f7)', hover: 'linear-gradient(45deg, #4f46e5, #9333ea)' },
      forest:  { primary: 'linear-gradient(45deg, #059669, #84cc16)', hover: 'linear-gradient(45deg, #047857, #65a30d)' },
      cherry:  { primary: 'linear-gradient(45deg, #dc2626, #db2777)', hover: 'linear-gradient(45deg, #b91c1c, #be185d)' }
    };

    const selectedTheme = colors[theme] || colors.default;

    // Set both primary and hover colors on the document.
    document.documentElement.style.setProperty('--primary-color', selectedTheme.primary);
    document.documentElement.style.setProperty('--primary-hover', selectedTheme.hover);

    return selectedTheme.primary;
  }
}
