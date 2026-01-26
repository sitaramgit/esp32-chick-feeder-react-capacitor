import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  IconButton,
  Grid,
  CircularProgress,
  Divider,
} from "@mui/material";

import LightbulbIcon from "@mui/icons-material/Lightbulb";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import VideocamIcon from "@mui/icons-material/Videocam";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import DashboardIcon from "@mui/icons-material/Dashboard";
import VideoCameraBackIcon from '@mui/icons-material/VideoCameraBack';
import ClimateChart from "./ClimateChart";
import CameraIndoorIcon from '@mui/icons-material/CameraIndoor';
import EngineeringIcon from '@mui/icons-material/Engineering';
import SensorDashboard from "./SensorDashboard";
import { rtdb } from "../utils/firebase";
import { onValue, ref, set } from "firebase/database";
import BluetoothSetup from "./BluetoothSetup";

export const Dashboard = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const hallLightRef = ref(rtdb, "/controls/hallLight");

  useEffect(() => {
    const unsubscribe = onValue(hallLightRef, (snapshot) => {
      setStatus(snapshot.val());
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleLight = async () => {
    if (status === null) return;
    await set(hallLightRef, status === 0 ? 1 : 0);
  };

  const isOn = status === 0;

  const sendCommand = (type: "food" | "water") => {
    alert(`Sending ${type} command to ESP32`);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f6f8" }}>
      {/* ---------------- TOP NAVBAR ---------------- */}


      {/* ---------------- MAIN CONTENT ---------------- */}
      <Box>
        <Grid container spacing={3}>
          {/* ----------- CONTROLS ----------- */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Controls
                </Typography>
                <Button sx={{ mb: 2 }} startIcon={<EngineeringIcon />} color="primary" variant="contained" fullWidth onClick={() => navigate("/operate-dispense")}>
                  Operate Dispenser
                </Button>
                <Button sx={{ mb: 2 }} startIcon={<VideoCameraBackIcon />} variant="contained" color="secondary" fullWidth onClick={() => navigate("/broadcaster")}>
                  Broadcaster
                </Button>

                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  startIcon={<RestaurantIcon />}
                  sx={{ mb: 2 }}
                  onClick={() => sendCommand("food")}
                >
                  Dispense Food
                </Button>

                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  color="secondary"
                  startIcon={<WaterDropIcon />}
                  onClick={() => sendCommand("water")}
                >
                  Dispense Water
                </Button>

{/* ---------------- on button ---------------- */}
                <Card
                  sx={{
                    mx: "auto",
                    borderRadius: 4,
                    boxShadow: 6,
                    mt:1,
                    background: isOn
                      ? "linear-gradient(135deg, #FFF9C4, #FFE082)"
                      : "linear-gradient(135deg, #ECEFF1, #CFD8DC)",
                  }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="h6" fontWeight={200}>
                        Hall Light
                      </Typography>

                      <LightbulbIcon
                        sx={{
                          fontSize: 26,
                          color: isOn ? "#FFC107" : "#90A4AE",
                        }}
                      />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexDirection="column"
                    >
                      {loading ? (
                        <CircularProgress />
                      ) : (
                        <>
                          <Typography
                            variant="subtitle1"
                            fontWeight={600}
                            color={isOn ? "success.main" : "text.secondary"}
                   
                          >
                            {isOn ? "ON" : "OFF"}
                          </Typography>

                          <IconButton
                            onClick={toggleLight}
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: "50%",
                              backgroundColor: isOn ? "#4CAF50" : "#B0BEC5",
                              color: "#fff",
                              "&:hover": {
                                backgroundColor: isOn ? "#43A047" : "#90A4AE",
                              },
                            }}
                          >
                            <PowerSettingsNewIcon fontSize="large" />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </CardContent>
                </Card>

              </CardContent>
            </Card>
          </Grid>

          {/* ----------- LIVE STREAM ----------- */}
          <Grid size={{ xs: 12, md: 6 }}>
            <SensorDashboard />
          </Grid>



          {/* ----------- CLIMATE CHART ----------- */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Climate Analysis
                </Typography>

                <ClimateChart />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Bluetooth Setup
                </Typography>

                <BluetoothSetup />
              </CardContent>
            </Card>
          </Grid>
          
        </Grid>
      </Box>
    </Box>
  );
};
