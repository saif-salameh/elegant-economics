// Theme switching functionality
const themeSwitcher = document.getElementById('theme-switcher');
const htmlElement = document.documentElement;

// Theme configuration
const themes = ['theme-1', 'theme-2', 'theme-3', 'theme-4', 'theme-5'];

// Load saved theme preference from localStorage
const savedTheme = localStorage.getItem('theme-preference');
let currentThemeIndex = 0;
let isDarkMode = false;

if (savedTheme) {
  const parts = savedTheme.split(' ');
  const themeName = parts[0];
  isDarkMode = parts.includes('dark');
  currentThemeIndex = themes.indexOf(themeName);
  if (currentThemeIndex === -1) currentThemeIndex = 0;
  applyTheme();
}

function applyTheme() {
  const themeName = themes[currentThemeIndex];
  const themeToApply = isDarkMode ? `${themeName} dark` : themeName;
  htmlElement.setAttribute('data-theme', themeToApply);
  localStorage.setItem('theme-preference', themeToApply);
}

function toggleThemeMode() {
  isDarkMode = !isDarkMode;
  applyTheme();
}

function cycleTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;
  applyTheme();
}

// Event listener for theme switcher button
if (themeSwitcher) {
  themeSwitcher.addEventListener('click', function() {
    // If we're at the last theme and in dark mode, cycle theme AND reset to light mode
    if (currentThemeIndex === themes.length - 1 && isDarkMode) {
      cycleTheme();
      isDarkMode = false;
      applyTheme();
    } else {
      // Otherwise toggle mode
      toggleThemeMode();
      // If we just toggled to light mode, it means we finished a theme cycle, so move to the next theme
      if (!isDarkMode) {
        cycleTheme();
      }
    }
  });
}
