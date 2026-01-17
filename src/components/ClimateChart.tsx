import { LineChart } from "@mui/x-charts/LineChart";
import { Box, Button, Stack } from "@mui/material";
import { useState, useMemo, useEffect } from "react";
import { onValue, ref } from "firebase/database";
import { rtdb } from "../utils/firebase";
import { groupData } from "../utils/common-functions";

export default function ClimateChart() {
  const [mode, setMode] = useState("hour");
 const [readings, setReadings] = useState([]);
  useEffect( () => {
         const readingsRef = ref(rtdb, "chick_form/readings");

    const unsubscribe = onValue(readingsRef, (snapshot: any) => {
      const data = snapshot.val();
      if (!data) return;

      // Convert object → array
      const formatted: any = Object.entries(data).map(([timestamp, value]: any) => {
    const dateObj = new Date(Number(timestamp) * 1000);

    return {
      timestamp: Number(timestamp),
      ...value,
      timeDetails: {
        date: dateObj.toLocaleDateString("en-CA"), // YYYY-MM-DD
        time: dateObj.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    };
  });

      // Sort by time (old → new)
      formatted.sort((a: any, b: any) => a.timestamp - b.timestamp);
console.log(formatted)
      setReadings(formatted);
    });

    return () => unsubscribe();
  },[])

  const chartData = useMemo(() => groupData(readings, mode), [readings, mode]);

  return (
    <Box>
      {/* Filters */}
      <Stack direction="row" spacing={1} mb={2}>
        {["hour", "day", "month", "year", "all"].map(m => (
          <Button
            key={m}
            variant={mode === m ? "contained" : "outlined"}
            onClick={() => setMode(m)}
          >
            {m.toUpperCase()}
          </Button>
        ))}
      </Stack>

      {/* Chart */}
      <LineChart
        height={350}
        xAxis={[
          {
            data: chartData.map(d => d.label),
            scaleType: "point",
          },
        ]}
        series={[
          {
            data: chartData.map(d => d.humidity),
            label: "Humidity (%)",
          },
          {
            data: chartData.map(d => d.temperature),
            label: "Temperature (°C)",
          },
        ]}
      />
    </Box>
  );
}
