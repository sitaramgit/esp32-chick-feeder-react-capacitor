import { useEffect, useState } from "react";
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
  Stack,
  Chip,
} from "@mui/material";

import LightbulbIcon from "@mui/icons-material/Lightbulb";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import DashboardIcon from "@mui/icons-material/Dashboard";
import VideoCameraBackIcon from "@mui/icons-material/VideoCameraBack";
import EngineeringIcon from "@mui/icons-material/Engineering";
import PetsIcon from "@mui/icons-material/Pets";
import { rtdb } from "../utils/firebase";
import { onValue, ref, set } from "firebase/database";
import SensorDashboard from "./SensorDashboard";
import ClimateChart from "./ClimateChart";
import BluetoothSetup from "./BluetoothSetup";

export const Dashboard = () => {
  const navigate = useNavigate();
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
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f6f8", p: { xs: 2, md: 3 } }}>
      <Box sx={{ maxWidth: 1400, mx: "auto" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <DashboardIcon sx={{ fontSize: 32, color: "primary.main" }} />
            <Box>
              <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: 1.5 }}>
                Home automation dashboard
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: "#1b2a1a" }}>
                Smart Home Control
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1} useFlexGap>
            <Chip icon={<PetsIcon />} label="Chicken farm" variant="outlined" color="success" onClick={() => navigate("/chicken-farm")} clickable />
          </Stack>
        </Stack>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: "100%", borderRadius: 4, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={700}>
                  Controls
                </Typography>

                <Stack spacing={1.5}>
                  <Button startIcon={<EngineeringIcon />} color="primary" variant="contained" fullWidth onClick={() => navigate("/operate-dispense")}>
                    Operate Dispenser
                  </Button>
                  <Button startIcon={<VideoCameraBackIcon />} variant="contained" color="secondary" fullWidth onClick={() => navigate("/broadcaster")}>
                    Broadcaster
                  </Button>
                  <Button startIcon={<RestaurantIcon />} variant="contained" fullWidth onClick={() => sendCommand("food")}>
                    Dispense Food
                  </Button>
                  <Button startIcon={<WaterDropIcon />} variant="contained" color="secondary" fullWidth onClick={() => sendCommand("water")}>
                    Dispense Water
                  </Button>
                  <Button startIcon={<PetsIcon />} variant="outlined" color="success" fullWidth onClick={() => navigate("/chicken-farm")}>
                    Open Chicken Farm Panel
                  </Button>
                </Stack>

                <Card
                  sx={{
                    mt: 3,
                    borderRadius: 4,
                    boxShadow: 6,
                    background: isOn ? "linear-gradient(135deg, #FFF9C4, #FFE082)" : "linear-gradient(135deg, #ECEFF1, #CFD8DC)",
                  }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="h6" fontWeight={600}>
                        Hall Light
                      </Typography>
                      <LightbulbIcon sx={{ fontSize: 26, color: isOn ? "#FFC107" : "#90A4AE" }} />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box display="flex" alignItems="center" justifyContent="center" flexDirection="column">
                      {loading ? (
                        <CircularProgress />
                      ) : (
                        <>
                          <Typography variant="subtitle1" fontWeight={600} color={isOn ? "success.main" : "text.secondary"}>
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
                              "&:hover": { backgroundColor: isOn ? "#43A047" : "#90A4AE" },
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

          <Grid size={{ xs: 12, md: 6 }}>
            <SensorDashboard />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card sx={{ borderRadius: 4, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={700}>
                  Climate Analysis
                </Typography>
                <ClimateChart />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card sx={{ borderRadius: 4, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={700}>
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

export default Dashboard;
