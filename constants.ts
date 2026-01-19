
export const ADMOB_CONFIG = {
  APP_ID: "ca-app-pub-3525151558499127~9154055343",
  BANNER_ID: "ca-app-pub-3525151558499127/4667837813",
  INTERSTITIAL_ID: "ca-app-pub-3525151558499127/9728592804",
};

/**
 * High-fidelity SVG representing the crystal 'V' logo.
 * This serves as a reliable built-in asset.
 */
export const DEFAULT_ICON_SVG = `data:image/svg+xml;base64,${btoa(`
<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="crystalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a855f7;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>
  <path d="M15 15 L50 85 L85 15 H65 L50 50 L35 15 H15Z" fill="url(#crystalGrad)" filter="url(#shadow)"/>
  <path d="M50 50 L35 15 H15 L50 85 Z" fill="white" fill-opacity="0.1"/>
</svg>
`)}`;

export const APP_ICON_URL = "icon.png";
export const LOGO_URL = APP_ICON_URL;
