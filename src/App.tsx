import React from 'react';
import logo from './logo.svg';
import './App.css';
import StartStream from './components/StartStream';
import WatchStream from './components/WatchStream';
import { Route, Routes } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import Viewer from './components/Viewer';
import Broadcaster from './components/Broadcaster';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/start" element={<StartStream />} />
      <Route path="/watch" element={<WatchStream />} />
      <Route path="/viewer" element={<Viewer />} />
      <Route path="/broadcaster" element={<Broadcaster />} />
    </Routes>
  );
}

export default App;
