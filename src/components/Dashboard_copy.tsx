import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Grid, Card, CardContent, Typography, Button } from '@mui/material';

import { doc, getDoc, collection, addDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db, rtdb } from "../utils/firebase";
import { onValue, ref } from "firebase/database";
import ClimateChart from "./ClimateChart";
export const Dashboard_copy = () => {

       
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const sendCommand = (type: 'food' | 'water') => {
    // Your Firebase write logic here, e.g., setDoc for commands
    alert(`Sending ${type} command to ESP32`);
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>Chick Feeder Dashboard</Typography>
      <Grid container spacing={3}>
        <Grid  >
          <Card>
            <CardContent>
              <Typography variant="h6">Live Surveillance Stream</Typography>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%' }} />
              <div style={styles.container}>
      <h2>Dashboard</h2>

      <div style={styles.card}>
        <h3>React Course</h3>
        <p>Learn React step by step</p>

         <div style={styles.actions}>
          <button onClick={() => navigate("/broadcaster")} style={styles.startBtn}>
            Broadcaster
          </button>
          <button onClick={() => navigate("/viewer")} style={styles.watchBtn}>
            viewer
          </button>
        </div>
      </div>
    </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid >
          <Card>
            <CardContent>
              <Typography variant="h6">Controls</Typography>
              <Button variant="contained" color="primary" onClick={() => sendCommand('food')} fullWidth sx={{ mb: 2 }}>
                Dispense Food
              </Button>
              <Button variant="contained" color="secondary" onClick={() => sendCommand('water')} fullWidth>
                Dispense Water
              </Button>
            </CardContent>
          </Card>
        </Grid>
        {/* Add more grids for charts, logs, etc. */}
        <ClimateChart />
      </Grid>
    </Box>
    
  );
};



/* ---------- Styles ---------- */
const styles = {
  container: {
    padding: 20,
  },
  card: {
    padding: 16,
    borderRadius: 10,
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    maxWidth: 300,
  },
  actions: {
    display: "flex",
    gap: 10,
    marginTop: 12,
  },
  startBtn: {
    background: "#22c55e",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: 6,
    cursor: "pointer",
  },
  watchBtn: {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: 6,
    cursor: "pointer",
  },
  page: {
    padding: 20,
  },
};