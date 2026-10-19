import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import {
  AutoAwesome as AutoAwesomeIcon,
  Lightbulb as LightbulbIcon,
  WaterDrop as WaterDropIcon,
  Thermostat as ThermostatIcon,
  Air as FanIcon,
  Agriculture as AgricultureIcon,
  SettingsInputAntenna as SignalIcon,
  Refresh as RefreshIcon,
  Pets as PetsIcon,
} from "@mui/icons-material";
import { onValue, ref, set } from "firebase/database";
import { rtdb } from "../utils/firebase";

type ControlsState = {
  gate: string;
  feeder_servo: string;
  feeder_motor: string;
  exhaust_fan: string;
  led: string;
  pump: string;
  bulb1: string;
  bulb2: string;
};

type SensorState = {
  temperature_c?: number;
  humidity_pct?: number;
  soil_raw?: number;
  soil_status?: string;
  last_update?: string;
};

const defaultControlsState: ControlsState = {
  gate: "stop",
  feeder_servo: "close",
  feeder_motor: "off",
  exhaust_fan: "off",
  led: "off",
  pump: "off",
  bulb1: "off",
  bulb2: "off",
};

const isOn = (value?: string) => (value ?? "off").toLowerCase() === "on" || value === "true" || value === "1";
const matchValue = (value?: string) => (value ?? "off").toLowerCase();

const ChickenFarmDashboard = () => {
  const [controls, setControls] = useState<ControlsState>(defaultControlsState);
  const [sensors, setSensors] = useState<SensorState>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("Waiting...");

  const farmControls = [
    { label: "Pump", path: "/controls/pump", value: controls.pump, icon: <WaterDropIcon /> },
    { label: "Bulb 1", path: "/controls/bulb1", value: controls.bulb1, icon: <LightbulbIcon /> },
    { label: "Bulb 2", path: "/controls/bulb2", value: controls.bulb2, icon: <LightbulbIcon /> },
    { label: "Exhaust fan", path: "/controls/exhaust_fan", value: controls.exhaust_fan, icon: <FanIcon /> },
    { label: "LED light", path: "/controls/led", value: controls.led, icon: <LightbulbIcon /> },
  ];

  const autoStatusItems = [
    ["Feeder servo", status.feeder_servo || controls.feeder_servo || "close"],
    ["Feeder motor", status.feeder_motor || controls.feeder_motor || "off"],
    ["Pump", controls.pump || "off"],
    ["Bulb 1", controls.bulb1 || "off"],
    ["Bulb 2", controls.bulb2 || "off"],
    ["Gate", controls.gate || "stop"],
    ["Exhaust fan", controls.exhaust_fan || "off"],
    ["LED", controls.led || "off"],
  ] as const;

  useEffect(() => {
    const controlRef = ref(rtdb, "/controls");
    const sensorRef = ref(rtdb, "/sensors");
    const statusRef = ref(rtdb, "/status");

    const unsubscribeControls = onValue(controlRef, (snapshot) => {
      const data = snapshot.val() || {};
      setControls((prev) => ({
        ...prev,
        gate: data.gate ?? prev.gate,
        feeder_servo: data.feeder_servo ?? prev.feeder_servo,
        feeder_motor: data.feeder_motor ?? prev.feeder_motor,
        exhaust_fan: data.exhaust_fan ?? prev.exhaust_fan,
        led: data.led ?? prev.led,
        pump: data.pump ?? prev.pump,
        bulb1: data.bulb1 ?? prev.bulb1,
        bulb2: data.bulb2 ?? prev.bulb2,
      }));
    });

    const unsubscribeSensors = onValue(sensorRef, (snapshot) => {
      const data = snapshot.val() || {};
      setSensors(data);
      setLastUpdated(data.last_update || "Waiting...");
      setLoading(false);
    });

    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      setStatus(snapshot.val() || {});
    });

    return () => {
      unsubscribeControls();
      unsubscribeSensors();
      unsubscribeStatus();
    };
  }, []);

  const updateControl = async (path: string, value: string) => {
    try {
      await set(ref(rtdb, path), value);
    } catch (error) {
      console.error("Firebase write failed:", error);
    }
  };

  const temperature = Number(sensors.temperature_c ?? 0);
  const humidity = Number(sensors.humidity_pct ?? 0);
  const soilRaw = Number(sensors.soil_raw ?? 0);
  const soilStatus = sensors.soil_status ?? "unknown";
  const soilLevel = Math.max(0, Math.min(100, ((4095 - soilRaw) / 4095) * 100));

  const summaryCards = useMemo(
    () => [
      {
        label: "Temperature",
        value: `${Number.isFinite(temperature) ? temperature.toFixed(1) : "--"}°C`,
        accent: temperature > 30 ? "error.main" : temperature < 20 ? "primary.main" : "success.main",
        icon: <ThermostatIcon color="inherit" />,
      },
      {
        label: "Humidity",
        value: `${Number.isFinite(humidity) ? humidity.toFixed(0) : "--"}%`,
        accent: humidity > 70 ? "info.main" : humidity < 40 ? "warning.main" : "success.main",
        icon: <WaterDropIcon color="inherit" />,
      },
      {
        label: "Soil",
        value: soilStatus,
        accent: soilStatus === "dry" ? "warning.main" : "success.main",
        icon: <AgricultureIcon color="inherit" />,
      },
      {
        label: "System",
        value: controls.led === "on" || controls.pump === "on" || controls.bulb1 === "on" || controls.bulb2 === "on" ? "Active" : "Idle",
        accent: "secondary.main",
        icon: <SignalIcon color="inherit" />,
      },
    ],
    [controls, humidity, soilStatus, temperature]
  );

  const toggleSwitch = async (path: string, currentValue: string) => {
    const nextValue = isOn(currentValue) ? "off" : "on";
    await updateControl(path, nextValue);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f4f7f1", minHeight: "100vh" }}>
      <Box sx={{ maxWidth: 1400, mx: "auto" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <PetsIcon sx={{ fontSize: 32, color: "primary.main" }} />
            <Box>
              <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: 1.5 }}>
                Chicken farm automation
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: "#1b2a1a" }}>
                Chick Farm Automation
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip icon={<SignalIcon />} label={lastUpdated} color="success" variant="outlined" />
            <IconButton color="primary" aria-label="refresh data" onClick={() => setLoading(false)}>
              <RefreshIcon />
            </IconButton>
          </Stack>
        </Stack>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {summaryCards.map((card) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
              <Card sx={{ borderRadius: 3, height: "100%", border: "1px solid rgba(20,40,22,0.08)" }}>
                <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="caption" sx={{ textTransform: "uppercase", color: "text.secondary" }}>
                      {card.label}
                    </Typography>
                    <Typography variant="h5" fontWeight={700} sx={{ color: card.accent }}>
                      {card.value}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: card.accent.replace(".main", ".light") }}>
                    {card.icon}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card sx={{ borderRadius: 4, boxShadow: 3, height: "100%" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                  Farm controls
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Grid container spacing={2}>
                  {farmControls.map((item) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={item.label}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          border: "1px solid rgba(0,0,0,0.08)",
                          bgcolor: isOn(item.value) ? "rgba(30, 144, 93, 0.09)" : "#f8faf8",
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ color: isOn(item.value) ? "success.main" : "text.disabled" }}>{item.icon}</Box>
                            <Typography fontWeight={600}>{item.label}</Typography>
                          </Stack>
                          <Switch
                            checked={isOn(item.value)}
                            onChange={() => toggleSwitch(item.path, item.value)}
                            color={isOn(item.value) ? "success" : "default"}
                          />
                        </Stack>
                        <Typography variant="caption" sx={{ color: "text.secondary", mt: 1, display: "block" }}>
                          Status: <strong>{matchValue(item.value)}</strong>
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                    Feeder and gate actions
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} useFlexGap>
                    <Button variant="contained" color="primary" onClick={() => updateControl("/controls/feeder_servo", "open")}>
                      Open feeder servo
                    </Button>
                    <Button variant="outlined" onClick={() => updateControl("/controls/feeder_servo", "close")}>
                      Close feeder servo
                    </Button>
                    <Button variant="contained" color="secondary" onClick={() => updateControl("/controls/feeder_motor", "on")}>
                      Start feeder motor
                    </Button>
                    <Button variant="outlined" onClick={() => updateControl("/controls/feeder_motor", "off")}>
                      Stop feeder motor
                    </Button>
                  </Stack>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} useFlexGap sx={{ mt: 2 }}>
                    <Button variant="contained" sx={{ bgcolor: "#2e7d32" }} onClick={() => updateControl("/controls/gate", "open")}>
                      Open gate
                    </Button>
                    <Button variant="contained" sx={{ bgcolor: "#ef6c00" }} onClick={() => updateControl("/controls/gate", "close")}>
                      Close gate
                    </Button>
                    <Button variant="outlined" onClick={() => updateControl("/controls/gate", "stop")}>
                      Stop gate
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Card sx={{ borderRadius: 4, boxShadow: 3, height: "100%" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                  Sensor overview
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: "#f7faf7" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography fontWeight={600}>Temperature</Typography>
                      <Typography color="primary.main" fontWeight={700}>{Number.isFinite(temperature) ? `${temperature.toFixed(1)}°C` : "--"}</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={Math.min(100, Math.max(0, (temperature / 50) * 100))} sx={{ mt: 1.5, height: 8, borderRadius: 999 }} color="primary" />
                  </Box>

                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: "#f7faf7" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography fontWeight={600}>Humidity</Typography>
                      <Typography color="info.main" fontWeight={700}>{Number.isFinite(humidity) ? `${humidity.toFixed(0)}%` : "--"}</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={Math.min(100, humidity)} sx={{ mt: 1.5, height: 8, borderRadius: 999, bgcolor: "#d9f1ff" }} color="info" />
                  </Box>

                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: "#f7faf7" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography fontWeight={600}>Soil moisture</Typography>
                      <Typography color={soilStatus === "dry" ? "warning.main" : "success.main"} fontWeight={700}>
                        {soilStatus}
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={soilLevel} sx={{ mt: 1.5, height: 8, borderRadius: 999 }} color={soilStatus === "dry" ? "warning" : "success"} />
                    <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
                      Raw ADC: {soilRaw || 0}
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: "#f7faf7" }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Device status
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {Object.entries({
                        Gate: controls.gate,
                        "Servo state": controls.feeder_servo,
                        "Motor state": controls.feeder_motor,
                        "Last update": lastUpdated,
                      }).map(([label, value]) => (
                        <Chip key={label} label={`${label}: ${value}`} variant="outlined" color={value === "on" || value === "open" ? "success" : "default"} />
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card sx={{ mt: 3, borderRadius: 4, boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Automated farm status
            </Typography>
            <Grid container spacing={2}>
              {autoStatusItems.map(([label, value]) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={label}>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: value === "on" || value === "open" ? "rgba(20, 165, 73, 0.08)" : "#f7faf7" }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                      {label}
                    </Typography>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" fontWeight={700}>{String(value)}</Typography>
                      <AutoAwesomeIcon color={value === "on" || value === "open" ? "success" : "disabled"} />
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default ChickenFarmDashboard;
