// src/theme/theme.js

import { createTheme, alpha } from '@mui/material/styles';

// Palette from Part 4.1 of the plan
const colors = {
    primary: '#2563eb',    // Modern Blue
    secondary: '#475569',  // Slate Gray
    success: '#059669',    // Green
    warning: '#d97706',    // Amber
    error: '#dc2626',      // Red
    neutral: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
    }
};

export const theme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: colors.primary },
        secondary: { main: colors.secondary },
        success: { main: colors.success },
        warning: { main: colors.warning },
        error: { main: colors.error },
        background: {
            default: colors.neutral[100], // Cool gray background
            paper: '#ffffff'
        },
        text: {
            primary: colors.neutral[800],
            secondary: colors.neutral[600],
        },
    },
    // Typography from Part 4.1
    typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        h4: { fontWeight: 700, fontSize: '2.125rem' },
        h5: { fontWeight: 600, fontSize: '1.5rem' },
        h6: { fontWeight: 600, fontSize: '1.25rem' },
        body1: { fontSize: '1rem' }, // 16px
        body2: { fontSize: '0.875rem' }, // 14px
        caption: { fontSize: '0.75rem' } // 12px
    },
    // Spacing from Part 4.1 (8px base unit)
    spacing: 8,
    // Shape from Part 4.1 (Consistent border radius)
    shape: {
        borderRadius: 8,
    },
    // Default component overrides from Part 4.3 & 4.4
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 6, // Slightly smaller radius for buttons
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: 'none',
                    }
                },
            },
            defaultProps: {
                disableElevation: true,
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05)',
                    border: `1px solid ${colors.neutral[200]}`,
                }
            }
        },
        MuiPaper: {
            defaultProps: {
                elevation: 0
            },
            styleOverrides: {
                root: {
                    border: `1px solid ${colors.neutral[200]}`,
                }
            }
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRight: `1px solid ${colors.neutral[200]}`
                }
            }
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    margin: '4px 8px',
                    '&.Mui-selected': {
                        backgroundColor: alpha(colors.primary, 0.08),
                        color: colors.primary,
                        fontWeight: 'bold',
                        '&:hover': {
                            backgroundColor: alpha(colors.primary, 0.12)
                        }
                    }
                }
            }
        },
        MuiTextField: {
            defaultProps: {
                variant: 'outlined',
                size: 'small'
            }
        },
        MuiAutocomplete: {
            defaultProps: {
                size: 'small'
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    fontWeight: 500
                }
            }
        },
        MuiDataGrid: {
            styleOverrides: {
                root: {
                    border: 'none',
                },
                columnHeaders: {
                     backgroundColor: alpha(colors.neutral[500], 0.04),
                     fontWeight: 'bold'
                }
            }
        }
    },
});