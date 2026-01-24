import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  CircularProgress,
  Divider,
  useTheme,
} from "@mui/material";
import {
  Thermostat as ThermostatIcon,
  Opacity as HumidityIcon,
  WaterDrop as MoistureIcon,       // or use Spa, Eco, Nature for plant/soil feel
  Refresh as RefreshIcon,
  DeviceThermostat as DeviceThermostatIcon,
} from "@mui/icons-material";
import { onValue, ref, DatabaseReference, set } from "firebase/database";
import { rtdb } from "../utils/firebase"; // ← your firebase realtime db import
import YardIcon from '@mui/icons-material/Yard';
interface SensorData {
  temperature?: number;
  humidity?: number;
  moisture?: number;
  readNow?: number; // probably 0 or 1 (trigger)
}

const SensorDashboard: React.FC = () => {
  const theme = useTheme();

  const [data, setData] = useState<SensorData>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const readingsRef: DatabaseReference = ref(rtdb, "sensor");

    useEffect(() => {
        const unsubscribe = onValue(readingsRef, (snapshot) => {
            const val: any = snapshot.val() as SensorData | null;
            setData(val || {});
            setLoading(false);
            const lastUpdatedAt = val.lastUpdatedAt; // 1769231296 (seconds)

            setLastUpdate(
                new Date(lastUpdatedAt * 1000).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                })
            );
        });

    // Optional: keep loading state a bit longer on first mount
    const timer = setTimeout(() => {
      if (loading) setLoading(false);
    }, 1200);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleManualRefresh = () => {
  if (loading) return;
  setLoading(true);

  set(ref(rtdb, "sensor/readNow"), 1)
    .catch(err => console.error("Trigger failed:", err))
    .finally(() => {
      // Give some time for ESP → Firebase → listener roundtrip
      setTimeout(() => setLoading(false), 2200);
    });
};

  const temp = data.temperature ?? 0;
  const hum = data.humidity ?? 0;
  const moist = data.moisture ?? 0;

  // Simple status colors
  const getTempColor = (t: number) =>
    t < 18 ? "primary.main" : t > 32 ? "error.main" : "success.main";

  const getHumidityColor = (h: number) =>
    h < 40 ? "warning.main" : h > 75 ? "info.main" : "success.main";

  const getMoistureColor = (m: number) =>
    m < 25 ? "error.main" : m < 45 ? "warning.main" : "success.main";

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" component="h1" fontWeight={600}>
          Environmental Sensors
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {lastUpdate && (
            <Typography variant="body2" color="text.secondary">
              Last update: {lastUpdate}
            </Typography>
          )}

          <IconButton
            onClick={handleManualRefresh}
            disabled={loading}
            color="primary"
            size="small"
            title="Refresh readings"
          >
            {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
          </IconButton>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {/* Temperature Card */}
          <Grid size={{ xs: 12, md: 4, sm: 6 }}>
            <Card elevation={2} sx={{ height: "100%", borderRadius: 3 }}>
              <CardContent sx={{ textAlign: "center", pb: 3 }}>
                <ThermostatIcon
                  sx={{ fontSize: 48, color: getTempColor(temp), mb: 1 }}
                />
                <Typography variant="h3" fontWeight={700} color={getTempColor(temp)}>
                  {temp.toFixed(1)}°C
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                  Temperature
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rooftop (2nd floor) – ambient condition
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Humidity Card */}
          <Grid size={{ xs: 12, md: 4, sm: 6  }}>
            <Card elevation={2} sx={{ height: "100%", borderRadius: 3 }}>
              <CardContent sx={{ textAlign: "center", pb: 3 }}>
                <HumidityIcon
                  sx={{ fontSize: 48, color: getHumidityColor(hum), mb: 1 }}
                />
                <Typography variant="h3" fontWeight={700} color={getHumidityColor(hum)}>
                  {hum.toFixed(1)}%
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                  Relative Humidity
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rooftop measurement
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Soil Moisture Card */}
          <Grid size={{ xs: 12, md: 4, sm: 6  }} >
            <Card elevation={2} sx={{ height: "100%", borderRadius: 3 }}>
              <CardContent sx={{ textAlign: "center", pb: 3 }}>
                {/* <MoistureIcon
                  sx={{ fontSize: 48, color: getMoistureColor(moist), mb: 1 }}
                /> */}
                <YardIcon
                  sx={{ fontSize: 48, color: getMoistureColor(moist), mb: 1 }}
                />
                <Typography variant="h3" fontWeight={700} color={getMoistureColor(moist)}>
                  {moist.toFixed(0)}%
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                  Soil Moisture
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Near mango tree roots
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Optional small status / info row */}
          <Grid size={{ xs: 12}}>
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Data used for automatic chick feeder control and mango tree monitoring
              </Typography>
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default SensorDashboard;