import { createTheme, linkClasses } from "@mui/material";
import { create } from "@mui/material/styles/createTransitions";
import { bgcolor, fontSize, palette, typography } from "@mui/system";
import { createContext, useMemo, useState } from "react";


export const tokens = (mode) => ({
  ...(mode==="dark" ?
    {grey: {
      100: "#e0e0e0",
      200: "#c2c2c2",
      300: "#a3a3a3",
      400: "#858585",
      500: "#666666",
      600: "#525252",
      700: "#3d3d3d",
      800: "#292929",
      900: "#141414"
    },
    primary: {
        100: "#d0d1d5",
        200: "#a1a4ab",
        300: "#727681",
        400: "#434957",
        500: "#141b2d",
        600: "#101624",
        700: "#0c101b",
        800: "#080b12",
        900: "#040509"
    },
    greenAccent: {
        100: "#dbf5ee",
        200: "#b7ebde",
        300: "#94e2cd",
        400: "#70d8bd",
        500: "#4cceac",
        600: "#3da58a",
        700: "#2e7c67",
        800: "#1e5245",
        900: "#0f2922"
    },
    redAccent: {
        100: "#f8dcdb",
        200: "#f1b9b7",
        300: "#e99592",
        400: "#e2726e",
        500: "#db4f4a",
        600: "#af3f3b",
        700: "#832f2c",
        800: "#58201e",
        900: "#2c100f"
    },
    blueAccent: {
        100: "#e1e2fe",
        200: "#c3c6fd",
        300: "#a4a9fc",
        400: "#868dfb",
        500: "#6870fa",
        600: "#535ac8",
        700: "#3e4396",
        800: "#2a2d64",
        900: "#151632"
    },
    yellowAccent: {
      100: "#feffe5",
      200: "#fdffcc",
      300: "#fcffb2",
      400: "#fbff99",
      500: "#faff7f",
      600: "#c8cc66",
      700: "#96994c",
      800: "#646633",
      900: "#323319"
    },
  }

    : 

    {grey: {
      100: "#F5F5F5",
      200: "#EEEEEE",
      300: "#E0E0E0",
      400: "#BDBDBD",
      500: "#9E9E9E",
      600: "#757575",
      700: "#616161",
      800: "#424242",
      900: "#212121",
    },
    primary: {
      100: "#E0E0E0", // Slightly lighter than original 100
      200: "#C2C2C2",
      300: "#A3A3A3",
      400: "#858585",
      500: "#666666",
      600: "#525252",
      700: "#3D3D3D",
      800: "#292929",
      900: "#141414",
    },
    greenAccent: {
      100: "#E9F5EE",
      200: "#C8F0E5",
      300: "#A9EBE2",
      400: "#8ACCE0",
      500: "#6CC1DB",
      600: "#52B1C5",
      700: "#3D9CC8",
      800: "#2A84C1",
      900: "#176DBF",
    },
    redAccent: {
      100: "#FFF1EF",
      200: "#FFD9D5",
      300: "#FFC1BC",
      400: "#FFA9A2",
      500: "#FF8F88",
      600: "#FF7670",
      700: "#FF5C58",
      800: "#FF433E",
      900: "#FF2A24",
    },
    blueAccent: {
      100: "#F0F3FF",
      200: "#E1E6FF",
      300: "#D1D9FF",
      400: "#BDC2FF",
      500: "#A4B5FF",
      600: "#8D9EFF",
      700: "#7588FF",
      800: "#5D72FF",
      900: "#455CFF",
    },
    yellowAccent: {
      100: "#323319",
      200: "#646633",
      300: "#96994c",
      400: "#c8cc66",
      500: "#faff7f",
      600: "#fbff99",
      700: "#fcffb2",
      800: "#fdffcc",
      900: "#feffe5"
    },
  }
  )

});


export const themeSettings = (mode) => {
  const colors = tokens(mode);

  return {
    palette: {
      mode: mode,
      ...(mode=="dark" ?
        {
          primary: {
            main: colors.primary[500],
          },
          secondary: {
            main: colors.greenAccent[500],
            dark: colors.greenAccent[700],
          },
          neutral: {
            dark: colors.grey[700],
            main: colors.grey[500],
            light: colors.grey[600],
          },
          background: {
            default: colors.primary[500],
          },
          terniary: {
            main: colors.yellowAccent[500],
            dark: colors.yellowAccent[700]
          }
        }
        :
        {
          primary: {
            main: colors.primary[100],
          },
          secondary: {
            main: colors.greenAccent[500],
            dark: colors.greenAccent[700],
          },
          neutral: {
            dark: colors.grey[700],
            main: colors.grey[500],
            light: colors.grey[100],
          },
          background: {
            default: "#fcfcfc",
          },
          terniary: {
            main: colors.yellowAccent[500],
            dark: colors.yellowAccent[700]
          }
        }
      )
    },
    typography: {
      fontSize: 12,
      h1 : {
        fontsize: 40
      },
      h2 : {
        fontsize: 32
      },
      h3 : {
        fontsize: 24
      },
      h4 : {
        fontsize: 20
      },
      h5 : {
        fontsize: 16
      },
      h6 : {
        fontsize: 14
      },
    },
    components: {
      MuiLink: {
        // ... your Link styles ...
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: colors.primary[600],
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: colors.primary[700], // Darker grey for Paper
          },
        },
      },
    },
  }
}


// Context for color mode

export const ColorModeContext = createContext({
  toggleColorMode: () => {}
});

export const useMode = () => {
  const [mode, setMode] = useState("dark");
  
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () =>
        setMode((prev) => (prev === "light" ? "dark" : "light")),
    }),
  )

  const theme = useMemo(() => createTheme(themeSettings(mode)), [mode])

  return [theme, colorMode];
}
