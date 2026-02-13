import React, { useLayoutEffect } from 'react';

/**
 * StyleInjector (Auto-upgraded)
 * Synchronizes Athena JSON settings with CSS Custom Properties (Variables).
 */
const StyleInjector = ({ siteSettings }) => {
  const settings = Array.isArray(siteSettings) ? (siteSettings[0] || {}) : (siteSettings || {});

  useLayoutEffect(() => {
    const root = document.documentElement;
    const isDark = settings.theme === 'dark';

    // 1. Theme Toggle
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // 2. Map Settings to CSS Variables
    const prefix = isDark ? 'dark_' : 'light_';
    
    const mappings = {
      'primary_color': ['--color-primary', '--primary-color'],
      'title_color': ['--color-title'],
      'heading_color': ['--color-heading'],
      'accent_color': ['--color-accent'],
      'button_color': ['--color-button', '--color-button-bg', '--btn-bg'],
      'card_color': ['--color-card', '--bg-surface', '--color-card-bg', '--card-bg', '--surface', '--color-surface'],
      'header_color': ['--color-header', '--bg-header', '--color-header-bg', '--nav-bg'],
      'bg_color': ['--color-background', '--bg-site'],
      'text_color': ['--color-text']
    };

    Object.entries(mappings).forEach(([key, vars]) => {
      const val = settings[prefix + key] || settings[key];
      if (val) {
        vars.forEach(v => root.style.setProperty(v, val));
      }
    });

    if (settings.global_radius) root.style.setProperty('--radius-custom', settings.global_radius);
    if (settings.hero_overlay_opacity !== undefined) root.style.setProperty('--hero-overlay-opacity', settings.hero_overlay_opacity);
    if (settings.content_top_offset !== undefined) root.style.setProperty('--content-top-offset', settings.content_top_offset + 'px');
    if (settings.header_height !== undefined) root.style.setProperty('--header-height', settings.header_height + 'px');

  }, [settings]);

  return null;
};

export default StyleInjector;