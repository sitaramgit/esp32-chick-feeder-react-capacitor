import React from 'react';
import logo from './logo.svg';
import './App.css';
import StartStream from './components/StartStream';
import WatchStream from './components/WatchStream';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import Viewer from './components/Viewer';
import Broadcaster from './components/Broadcaster';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: { main: '#4CAF50' },  // Green for farm theme
    secondary: { main: '#FF9800' },  // Orange for alerts (e.g., low water)
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',  // Clean modern font
  },
});

function App() {
  return (
   <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          // ───── Main safe area fixes ─────
          pt: '24px',     // ← status bar / notch
          pb: '24px',  // ← navigation bar / gesture area
        }}
      >
      <Routes>                                 {/* ← no HashRouter here anymore */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/start" element={<StartStream />} />
        <Route path="/watch" element={<WatchStream />} />
        <Route path="/viewer" element={<Viewer />} />
        <Route path="/broadcaster" element={<Broadcaster />} />
      </Routes>
      </Box>
    </ThemeProvider>
  );
}

export default App;
