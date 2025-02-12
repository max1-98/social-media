import { createTheme, linkClasses } from "@mui/material";
import { create } from "@mui/material/styles/createTransitions";
import { bgcolor, fontSize, palette, typography } from "@mui/system";
import { createContext, useMemo, useState } from "react";
import { alpha, getContrastRatio } from '@mui/material/styles';

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

    {
      "grey": {
        "100": "#F9F9F9",
        "200": "#F2F2F2",
        "300": "#E8E8E8",
        "400": "#D3D3D3",
        "500": "#BDBDBD",
        "600": "#A6A6A6",
        "700": "#8F8F8F",
        "800": "#787878",
        "900": "#616161"
      },
      "primary": {
          100: "#fefefe",
          200: "#fdfdfd",
          300: "#fbfbfb",
          400: "#fafafa",
          500: "#f9f9f9",
          600: "#c7c7c7",
          700: "#959595",
          800: "#646464",
          900: "#323232"
      },
      "greenAccent": {
        100: "#cdf4e9",
        200: "#9be9d4",
        300: "#69ddbe",
        400: "#37d2a9",
        500: "#05c793",
        600: "#049f76",
        700: "#037758",
        800: "#02503b",
        900: "#01281d"
      },
      "redAccent": {
        "100": "#FFF5F2",
        "200": "#FFEBE8",
        "300": "#FFD8D1",
        "400": "#FFC3B5",
        "500": "#FFAAB0",
        "600": "#FF968A",
        "700": "#FF8264",
        "800": "#FF6E40",
        "900": "#FF5A1B"
      },
      "blueAccent": {
        100: "#ced0dd",
        200: "#9da1bb",
        300: "#6d7198",
        400: "#3c4276",
        500: "#0b1354",
        600: "#090f43",
        700: "#070b32",
        800: "#040822",
        900: "#020411"
      },
      "yellowAccent": {
        "100": "#FEFEF0",
        "200": "#FDFDF2",
        "300": "#FCFCF6",
        "400": "#FAFAE1",
        "500": "#F8F8CC",
        "600": "#F7F7B7",
        "700": "#F6F6A2",
        "800": "#F5F58D",
        "900": "#F4F478"
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
            light: colors.primary[700],
            dark: colors.primary[300],
            contrastText: getContrastRatio(colors.primary[500], '#fff') > 4.5 ? '#fff' : '#111',
          },
          secondary: {
            main: colors.greenAccent[500],
            dark: colors.greenAccent[700],
            light: colors.greenAccent[300],
            contrastText: getContrastRatio(colors.greenAccent[500], '#fff') > 4.5 ? '#fff' : '#111',
          },
          neutral: {
            dark: colors.grey[700],
            main: colors.grey[500],
            light: colors.grey[600],
            contrastText: getContrastRatio(colors.grey[500], '#fff') > 4.5 ? '#fff' : '#111',
          },
          background: {
            default: colors.primary[500],
          },
          terniary: {
            main: colors.yellowAccent[500],
            dark: colors.yellowAccent[700]
          },
          common: {
            dark: "#2c2c2c",
            main: "#dddddd",
            light: "#ebebeb",
            contrastText: '#fff',
          
          },
          userprofile: {
            card: colors.grey[800],
            paper: colors.grey[700],
            cardContrastText: getContrastRatio(colors.grey[800], '#fff') > 4.5 ? '#fff' : '#111',
            paperContrastText: getContrastRatio(colors.grey[700], '#fff') > 4.5 ? '#fff' : '#111',

          } 
        }
        :
        {
          primary: {
            main: colors.primary[500],
            dark: colors.primary[700],
            light: colors.primary[100],
            contrastText: getContrastRatio(colors.primary[500], '#fff') > 4.5 ? '#fff' : '#111',
          },
          secondary: {
            main: colors.blueAccent[500],
            dark: colors.blueAccent[700],
          },
          neutral: {
            dark: colors.grey[700],
            main: colors.grey[500],
            light: colors.grey[300],
          },
          background: {
            default: colors.primary[500],
          },
          terniary: {
            main: colors.greenAccent[500],
            dark: colors.greenAccent[700]
          },
          common: {
            main: colors.primary[900],
            dark: colors.primary[500],
            light: colors.primary[400],
            contrastText: getContrastRatio(colors.primary[500], '#fff') > 4.5 ? '#fff' : '#111',
          },

          userprofile: {
            card: colors.primary[500],
            paper: colors.blueAccent[500],
            cardContrastText: getContrastRatio(colors.primary[500], '#fff') > 4.5 ? '#fff' : '#111',
            paperContrastText: getContrastRatio(colors.blueAccent[500], '#fff') > 4.5 ? '#fff' : '#111',

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
  }
}


// Context for color mode

export const ColorModeContext = createContext({
  toggleColorMode: () => {}
});

export const useMode = () => {
  const isSystemDark = window.matchMedia("(prefers-color-scheme:dark)").matches
  const [mode, setMode] = useState(isSystemDark ? "dark" : "light");
  
  
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () =>
        setMode((prev) => (prev === "light" ? "dark" : "light")),
    }),
  )

  const theme = useMemo(() => createTheme(themeSettings(mode)), [mode])

  return [theme, colorMode];
}
