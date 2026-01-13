import React from 'react';
import logo from './logo.svg';
import './App.css';
import StartStream from './components/StartStream';
import WatchStream from './components/WatchStream';
import { Route, Routes } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import Viewer from './components/Viewer';
import Broadcaster from './components/Broadcaster';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

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
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/start" element={<StartStream />} />
      <Route path="/watch" element={<WatchStream />} />
      <Route path="/viewer" element={<Viewer />} />
      <Route path="/broadcaster" element={<Broadcaster />} />
    </Routes>
    </ThemeProvider>
  );
}

export default App;
