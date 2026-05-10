/**
 * Design System Tokens
 * Based on oklch color system for perceptual uniformity
 * Reference: stopped-state-3.html design
 */

export const designTokens = {
  // Color palette (oklch)
  colors: {
    bg: "oklch(99% 0.002 240)",
    surface: "oklch(100% 0 0)",
    fg: "oklch(18% 0.012 250)",
    muted: "oklch(54% 0.012 250)",
    border: "oklch(92% 0.005 250)",
    accent: "oklch(58% 0.18 255)",
    accentHover: "oklch(53% 0.18 255)",
    danger: "oklch(50% 0.18 22)",
    dangerHover: "oklch(48% 0.2 22)",
  },

  // Typography
  fonts: {
    display: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
    sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, Menlo, monospace",
  },

  fontSize: {
    xs: "11px",
    sm: "12px",
    base: "13px",
    lg: "14px",
    xl: "16px",
    "2xl": "18px",
    "3xl": "20px",
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Spacing
  spacing: {
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    "2xl": "20px",
    "3xl": "24px",
    "4xl": "32px",
  },

  // Border radius
  radius: {
    sm: "6px",
    md: "8px",
    lg: "10px",
    xl: "14px",
    full: "999px",
  },

  // Letter spacing
  letterSpacing: {
    tight: "-0.025em",
    normal: "0em",
    relaxed: "0.08em",
    wide: "0.12em",
  },

  // Z-index layers
  zIndex: {
    base: 1,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modal: 40,
    tooltip: 50,
  },

  // Shadows
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  },

  // Transitions
  transitions: {
    fast: "0.12s",
    normal: "0.14s",
    slow: "0.18s",
  },
} as const;

// CSS custom properties to be injected into root
export const cssVariables = `
  --bg: ${designTokens.colors.bg};
  --surface: ${designTokens.colors.surface};
  --fg: ${designTokens.colors.fg};
  --muted: ${designTokens.colors.muted};
  --border: ${designTokens.colors.border};
  --accent: ${designTokens.colors.accent};
  --accent-hover: ${designTokens.colors.accentHover};
  --danger: ${designTokens.colors.danger};
  --danger-hover: ${designTokens.colors.dangerHover};
  --font-display: ${designTokens.fonts.display};
  --font-sans: ${designTokens.fonts.sans};
  --font-mono: ${designTokens.fonts.mono};
` as const;
