import React from 'react';
import { COLORS, SPACING, FONT_WEIGHTS } from '../../constants';

// Button variants
const BUTTON_VARIANTS = {
  primary: {
    background: COLORS.info,
    color: 'white',
    border: `1px solid ${COLORS.info}`,
    ':hover': {
      background: '#0056b3'
    }
  },
  secondary: {
    background: 'transparent',
    color: COLORS.secondary,
    border: `1px solid ${COLORS.border}`,
    ':hover': {
      background: COLORS.light
    }
  },
  success: {
    background: COLORS.success,
    color: 'white',
    border: `1px solid ${COLORS.success}`,
    ':hover': {
      background: COLORS.successDark
    }
  },
  warning: {
    background: COLORS.warning,
    color: 'white',
    border: `1px solid ${COLORS.warning}`,
    ':hover': {
      background: '#e8650e'
    }
  },
  danger: {
    background: COLORS.error,
    color: 'white',
    border: `1px solid ${COLORS.error}`,
    ':hover': {
      background: '#9a1a2a'
    }
  }
};

// Button sizes
const BUTTON_SIZES = {
  small: {
    padding: `${SPACING.xs}px ${SPACING.sm}px`,
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.medium
  },
  medium: {
    padding: `${SPACING.sm}px ${SPACING.md}px`,
    fontSize: 14,
    fontWeight: FONT_WEIGHTS.medium
  },
  large: {
    padding: `${SPACING.md}px ${SPACING.lg}px`,
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.semibold
  }
};

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  onClick, 
  className = '',
  style = {},
  ...props 
}) {
  const variantStyles = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const sizeStyles = BUTTON_SIZES[size] || BUTTON_SIZES.medium;

  const buttonStyle = {
    ...variantStyles,
    ...sizeStyles,
    borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.6 : 1,
    border: variantStyles.border,
    ...style
  };

  return (
    <button
      className={`btn ${className}`}
      style={buttonStyle}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ 
  label, 
  error, 
  className = '', 
  style = {},
  containerStyle = {},
  ...props 
}) {
  const inputStyle = {
    width: '100%',
    padding: SPACING.sm,
    border: `1px solid ${error ? COLORS.error : COLORS.border}`,
    borderRadius: 4,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s ease',
    ':focus': {
      borderColor: COLORS.info
    },
    ...style
  };

  const labelStyle = {
    display: 'block',
    marginBottom: SPACING.xs,
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: FONT_WEIGHTS.medium
  };

  return (
    <div style={{ marginBottom: SPACING.md, ...containerStyle }}>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        className={`input ${className}`}
        style={inputStyle}
        {...props}
      />
      {error && (
        <div style={{ 
          marginTop: SPACING.xs, 
          fontSize: 12, 
          color: COLORS.error 
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

export function Card({ children, variant = 'default', className = '', style = {}, ...props }) {
  const baseStyle = {
    background: COLORS.background,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: SPACING.md,
    transition: 'box-shadow 0.2s ease',
    ...style
  };

  const variantStyles = {
    default: {},
    compact: {
      padding: SPACING.sm,
      borderRadius: 6
    },
    clickable: {
      cursor: 'pointer',
      ':hover': {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }
    }
  };

  const finalStyle = { ...baseStyle, ...variantStyles[variant] };

  return (
    <div className={`card ${className}`} style={finalStyle} {...props}>
      {children}
    </div>
  );
}

export function Badge({ children, variant = 'neutral', className = '', style = {} }) {
  const variantStyles = {
    success: { background: COLORS.success, color: 'white' },
    warning: { background: COLORS.warning, color: 'white' },
    error: { background: COLORS.error, color: 'white' },
    info: { background: COLORS.info, color: 'white' },
    neutral: { background: COLORS.secondary, color: 'white' },
    greatDeal: { background: COLORS.greatDeal, color: 'white' },
    goodDeal: { background: COLORS.goodDeal, color: 'white' },
    badDeal: { background: COLORS.badDeal, color: 'white' },
    overpriced: { background: COLORS.overpriced, color: 'white' }
  };

  const badgeStyle = {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.bold,
    ...variantStyles[variant],
    ...style
  };

  return (
    <span className={`badge ${className}`} style={badgeStyle}>
      {children}
    </span>
  );
}