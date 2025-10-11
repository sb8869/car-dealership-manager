import { COLORS, SPACING, FONT_WEIGHTS } from '../constants';

// Enhanced modal styles using centralized constants
export const modalStyles = {
  flexColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md
  },
  
  flexRow: {
    display: 'flex',
    gap: SPACING.sm,
    alignItems: 'center'
  },
  
  flexRowSpaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  
  scrollableArea: {
    maxHeight: 420,
    overflowY: 'auto',
    paddingRight: 6
  },
  
  sectionTitle: {
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary
  },
  
  marginTopSmall: {
    marginTop: SPACING.sm
  },
  
  marginTopMedium: {
    marginTop: SPACING.md
  },

  marginTopLarge: {
    marginTop: SPACING.lg
  },

  // Form styles
  formGroup: {
    marginBottom: SPACING.md
  },

  label: {
    display: 'block',
    marginBottom: SPACING.xs,
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: FONT_WEIGHTS.medium
  },

  input: {
    width: '100%',
    padding: SPACING.sm,
    marginTop: 6,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    fontSize: 14
  },

  // Card styles
  card: {
    background: COLORS.background,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: SPACING.md
  },

  cardCompact: {
    background: COLORS.background,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    padding: SPACING.sm
  }
};