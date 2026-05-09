import React, { createContext, useMemo, useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

export const ThemeContext = createContext({
    mode: 'light',
    toggleTheme: () => { }
});

export const ThemeContextProvider = ({ children }) => {
    const [mode, setMode] = useState(() => {
        try {
            const savedMode = localStorage.getItem('appThemeMode');
            return savedMode === 'dark' ? 'dark' : 'light';
        } catch {
            return 'light';
        }
    });

    useEffect(() => {
        localStorage.setItem('appThemeMode', mode);
    }, [mode]);

    const toggleTheme = () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    };

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    ...(mode === 'light'
                        ? {
                            // Light mode palette
                            background: {
                                default: '#ffffff',
                                paper: '#ffffff',
                            },
                            primary: {
                                main: '#1a73e8',
                            },
                            secondary: {
                                main: '#e8f0fe',
                            },
                            text: {
                                primary: '#202124',
                                secondary: '#5f6368',
                            },
                            divider: '#e8eaed',
                            action: {
                                hover: '#f8fbff',
                            }
                        }
                        : {
                            // Dark mode palette
                            background: {
                                default: '#000000',
                                paper: '#121212',
                            },
                            primary: {
                                main: '#3b82f6',
                            },
                            secondary: {
                                main: '#1e1e1e',
                            },
                            text: {
                                primary: '#f9fafb',
                                secondary: '#9ca3af',
                            },
                            divider: 'rgba(255,255,255,0.12)',
                            action: {
                                hover: '#1e1e1e',
                            }
                        }),
                },
                typography: {
                    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                },
                components: {
                    MuiButton: {
                        styleOverrides: {
                            root: {
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: '12px',
                            },
                            contained: {
                                backgroundColor: mode === 'dark' ? 'rgba(156, 163, 175, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                                backdropFilter: 'blur(12px)',
                                color: mode === 'dark' ? '#ffffff' : '#000000',
                                border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
                                boxShadow: 'none',
                                '&:hover': {
                                    backgroundColor: mode === 'dark' ? 'rgba(156, 163, 175, 0.35)' : 'rgba(107, 114, 128, 0.35)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                }
                            },
                            containedPrimary: {
                                // Explicitly override primary color background to prevent blue fallback
                                backgroundColor: mode === 'dark' ? 'rgba(156, 163, 175, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                                '&:hover': {
                                    backgroundColor: mode === 'dark' ? 'rgba(156, 163, 175, 0.35)' : 'rgba(107, 114, 128, 0.35)',
                                }
                            },
                            text: {
                                color: mode === 'dark' ? '#d1d5db' : '#374151',
                                '&:hover': {
                                    backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                    backdropFilter: 'blur(8px)',
                                }
                            }
                        },
                    },
                    MuiIconButton: {
                        styleOverrides: {
                            root: {
                                color: mode === 'dark' ? '#d1d5db' : '#374151',
                                '&:hover': {
                                    backgroundColor: mode === 'dark' ? 'rgba(156, 163, 175, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                                    backdropFilter: 'blur(8px)',
                                }
                            }
                        }
                    }
                },
            }),
        [mode]
    );

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
};
