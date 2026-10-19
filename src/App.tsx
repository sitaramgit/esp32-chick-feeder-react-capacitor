import React from 'react';
import './App.css';
import StartStream from './components/StartStream';
import WatchStream from './components/WatchStream';
import { Route, Routes } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import ChickenFarmDashboard from './components/ChickenFarmDashboard';
import Viewer from './components/Viewer';
import Broadcaster from './components/Broadcaster';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './Layout';
import ClimateChart from './components/ClimateChart';
import AuthGate from './components/AuthGate';

const theme = createTheme({
  palette: {
    primary: { main: 'rgb(58 168 142)' },  // Green for farm theme
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

      <AuthGate>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chicken-farm" element={<ChickenFarmDashboard />} />
            <Route path="/start" element={<StartStream />} />
            <Route path="/watch" element={<WatchStream />} />
            <Route path="/operate-dispense" element={<Viewer />} />
            <Route path="/broadcaster" element={<Broadcaster />} />
            <Route path="/climate-chart" element={<ClimateChart />} />
          </Route>
        </Routes>
      </AuthGate>
    </ThemeProvider>
  );
}

export default App;
