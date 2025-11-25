// Clone Game Design System - Based on actual app design

export const colors = {
  // Primary - YELLOW
  primaryBlue: '#FDD804',

  // Backgrounds
  background: '#F5F5F5',
  cardBg: '#FFFFFF',

  // Text
  textPrimary: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',

  // UI
  border: '#E5E5E5',
  error: '#FF3B30',
  success: '#34C759',

  // Result colors (kept for result screen)
  resultSuccess: '#00D9A3',
  resultFailure: '#FF6B6B',
} as const;

export const typography = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",

  // Type Scale
  huge: {
    fontSize: '48px',
    fontWeight: 900,
    lineHeight: 1.1,
  },
  large: {
    fontSize: '32px',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  medium: {
    fontSize: '24px',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  bodyLarge: {
    fontSize: '20px',
    fontWeight: 400,
    lineHeight: 1.4,
  },
  body: {
    fontSize: '16px',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  small: {
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: 1.5,
  },
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
  xxxl: '32px',
} as const;

export const borderRadius = {
  sm: '16px',
  md: '20px',
  lg: '24px',
  full: '100px',
} as const;

export const shadows = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
} as const;

// Component-specific styles
export const components = {
  button: {
    primary: {
      height: '56px',
      backgroundColor: colors.primaryBlue,
      color: '#FFFFFF',
      borderRadius: borderRadius.full,
      fontSize: '20px',
      fontWeight: 700,
      padding: `0 ${spacing.xxxl}`,
      border: 'none',
      cursor: 'pointer',
      transition: 'all 150ms ease',
    },
    large: {
      height: '140px',
      backgroundColor: colors.primaryBlue,
      color: '#FFFFFF',
      borderRadius: borderRadius.lg,
      fontSize: '24px',
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 150ms ease',
    },
  },
  input: {
    backgroundColor: colors.cardBg,
    border: `2px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    padding: spacing.xl,
    fontSize: '18px',
    fontFamily: typography.fontFamily,
    transition: 'border-color 150ms ease',
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    border: `2px solid ${colors.border}`,
  },
} as const;

// Animation presets
export const animations = {
  scaleDown: 'transform 150ms ease',
  fadeIn: 'opacity 300ms ease',
  slideUp: 'transform 300ms ease',
} as const;
