/**
 * Theme Engine for Portfolio
 * Manages color palettes and persistence
 */

const themes = {
    gold: {
        '--color-primary': '#030305',      // Deep Space Black
        '--color-secondary': '#0a0a0e',    // Dark Glass
        '--color-accent': '#fbbf24',       // Gold
        '--color-accent-hover': '#f59e0b',
        '--color-neon-blue': '#3b82f6',    // Blue
        '--color-text': '#e2e8f0'          // Slate 200
    },
    emerald: {
        '--color-primary': '#020617',      // Slate 950
        '--color-secondary': '#0f172a',    // Slate 900
        '--color-accent': '#10b981',       // Emerald
        '--color-accent-hover': '#059669',
        '--color-neon-blue': '#2dd4bf',    // Teal
        '--color-text': '#f1f5f9'
    },
    ruby: {
        '--color-primary': '#180202',      // Dark Red
        '--color-secondary': '#2d0a0a',    // Deep Maroon
        '--color-accent': '#ef4444',       // Red
        '--color-accent-hover': '#dc2626',
        '--color-neon-blue': '#f97316',    // Orange
        '--color-text': '#fee2e2'
    },
    midnight: {
        '--color-primary': '#020617',      // Slate 950
        '--color-secondary': '#1e1b4b',    // Indigo 950
        '--color-accent': '#8b5cf6',       // Violet
        '--color-accent-hover': '#7c3aed',
        '--color-neon-blue': '#3b82f6',    // Blue
        '--color-text': '#eef2ff'
    }
};

function applyTheme(themeName) {
    const theme = themes[themeName] || themes.gold;
    const root = document.documentElement;
    
    Object.keys(theme).forEach(property => {
        root.style.setProperty(property, theme[property]);
    });
    
    localStorage.setItem('portfolio-theme', themeName);
    
    // Dispatch event for other pages
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { themeName } }));
}

async function initTheme() {
    const savedTheme = localStorage.getItem('portfolio-theme');
    
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        try {
            // Fetch global default if no local preference
            const response = await fetch('/api/settings/theme');
            const data = await response.json();
            applyTheme(data.theme || 'gold');
        } catch (err) {
            console.error("Theme sync error:", err);
            applyTheme('gold');
        }
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initTheme);
window.applyTheme = applyTheme; // Make it globally accessible
