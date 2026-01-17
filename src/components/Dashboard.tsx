import { useRef } from "react";
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
} from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import DashboardIcon from "@mui/icons-material/Dashboard";
import VideoCameraBackIcon from '@mui/icons-material/VideoCameraBack';
import ClimateChart from "./ClimateChart";
import CameraIndoorIcon from '@mui/icons-material/CameraIndoor';
 import EngineeringIcon from '@mui/icons-material/Engineering';

export const Dashboard = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

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
                 <Button sx={{ mb: 2 }} startIcon={<EngineeringIcon/>} color="primary" variant="contained" fullWidth onClick={() => navigate("/operate-dispense")}>
                  Operate Dispenser
                </Button>
                <Button sx={{ mb: 2 }} startIcon={<VideoCameraBackIcon/>} variant="contained" color="secondary" fullWidth onClick={() => navigate("/broadcaster")}>
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
              </CardContent>
            </Card>
          </Grid>

          {/* ----------- LIVE STREAM ----------- */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Live Surveillance
                </Typography>

                <Box
                  sx={{
                    width: "100%",
                    height: 360,
                    bgcolor: "#000",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ width: "100%", height: "100%" }}
                  />
                </Box>
              </CardContent>
            </Card>
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
        </Grid>
      </Box>
    </Box>
  );
};
