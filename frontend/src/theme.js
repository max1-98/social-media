import { MantineProvider, ColorSchemeProvider, GlobalStyles } from '@mantine/core';
import { createTheme } from '@mantine/core'; // Import the createTheme function


const myTheme = createTheme({
    colorScheme: 'dark',
    colors: {
      primary: ['#f00', '#ff0', '#0f0'], // Custom color palette
      secondary: ['#000', '#000', '#fff'],
      // ... more colors
    },
    fontFamily: {
      default: 'Roboto',
      heading: 'Inter', // Custom font for headings
      mono: 'Fira Code', // Custom font for code
    },
    components: {
      Button: {
        defaultProps: {
          radius: 'sm', // Apply radius to all buttons
        },
      },
      // ... more component-specific styles
    },
    // ... more theme customizations
  });