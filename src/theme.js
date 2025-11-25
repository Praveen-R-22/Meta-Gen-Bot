import { createTheme } from "@mui/material/styles";

const commonTypography = {
  fontFamily: '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
  fontSize: 12,
  h5: {
    fontWeight: 700,
    color: "#ffffffff",
  },
  h6: {
    fontWeight: 600,
    color: "#003554",
  },
  button: {
    textTransform: "none",
    fontWeight: 600,
  },
};

const commonComponents = {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: "none",
          boxShadow: "none",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          // Enforce the navy color globally with !important
          backgroundColor: "#003554 !important", 
          color: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#00475b",
          color: "#fff",
        },
      },
    },
};

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#003554",
      contrastText: "#fff",
    },
    secondary: {
      main: "#009CDE",
      contrastText: "#fff",
    },
    background: {
      default: "#f5f7fa",
      paper: "#ffffff",
    },
    text: {
      primary: "#212121",
      secondary: "#555555",
    },
  },
  typography: commonTypography,
  components: commonComponents,
});

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#009CDE", 
      contrastText: "#fff",
    },
    secondary: {
      main: "#005670", 
      contrastText: "#fff",
    },
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
    text: {
      primary: "#e0e0e0",
      secondary: "#b0bec5",
    },
  },
  typography: {
    ...commonTypography,
    h5: {
      ...commonTypography.h5,
      color: "#e0e0e0", 
    },
    h6: {
      ...commonTypography.h6,
      color: "#e0e0e0", 
    },
  },
  components: {
    ...commonComponents,
    MuiPaper: {
        styleOverrides: {
            root: {
                backgroundImage: 'unset', 
            }
        }
    }
  },
});