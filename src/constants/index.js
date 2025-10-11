// Centralized constants for the car dealership application

// Colors
export const COLORS = {
  // Status colors
  success: '#28a745',
  successLight: '#e6ffef', 
  successDark: '#147a38',
  warning: '#fd7e14',
  warningLight: '#fff3e0',
  error: '#b21f2d',
  errorLight: '#fff0f0',
  info: '#007bff',
  infoLight: '#e7f3ff',
  
  // Neutral colors
  primary: '#0f172a',
  secondary: '#6c757d',
  light: '#f8f9fa',
  border: '#dee2e6',
  borderLight: '#f1f1f1',
  background: '#ffffff',
  
  // Deal badge colors
  greatDeal: '#146c43',
  goodDeal: '#28a745',
  neutral: '#6c757d',
  badDeal: '#fd7e14',
  overpriced: '#b21f2d',
  
  // Inspection colors
  inspectionBg: '#fff8e6',
  inspectionBorder: '#f4e1b8'
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
};

// Font weights
export const FONT_WEIGHTS = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900
};

// Common breakpoints
export const BREAKPOINTS = {
  sm: '576px',
  md: '768px',
  lg: '992px',
  xl: '1200px'
};

// Game constants
export const GAME_CONFIG = {
  MARKET_SIZE: 24,
  MARKET_CHURN: 0.30,
  GAME_DAY_MS: 60 * 1000, // 1 minute per in-game day
  PRICE_UPDATE_COOLDOWN: 60000, // ms
  REFRESH_COOLDOWN: 60000, // ms
  REPAIR_MIN_COST: 200
};

// Modal sizes
export const MODAL_SIZES = {
  small: 'min(600px, 92vw)',
  medium: 'min(900px, 92vw)', 
  large: 'min(1200px, 92vw)',
  xlarge: 'min(1400px, 92vw)'
};