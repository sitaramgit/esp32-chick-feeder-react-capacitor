import { LineChart } from "@mui/x-charts/LineChart";
import { Box, Button, Stack } from "@mui/material";
import { useState, useMemo, useEffect } from "react";
import { limitToLast, onValue, query, ref } from "firebase/database";
import { rtdb } from "../utils/firebase";
import { groupData } from "../utils/common-functions";

export default function ClimateChart() {
  const [mode, setMode] = useState("hour");
  const [readings, setReadings] = useState([]);
  useEffect(() => {
    const q = getQueryByMode(mode);

    const unsubscribe = onValue(q, (snapshot: any) => {
      const data = snapshot.val();
      if (!data) return;

      // Convert object → array
      const firebaseObjectData: any = Object.entries(data);
      const formatted: any = firebaseObjectData.map(([timestamp, value]: any, index: number) => {
        const dateObj = new Date(Number(timestamp) * 1000);

        return {
          timestamp: Number(timestamp),
          ...value,
          humidity: value.humidity ?? firebaseObjectData[index - 1]?.[1]?.humidity ?? 0,
          temperature: value.temperature ?? firebaseObjectData[index - 1]?.[1]?.temperature ?? 0,
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
  }, [mode])

  const getQueryByMode = (mode: string) => {
  switch (mode) {
    case "hour":
      return query(ref(rtdb, "chick_form/readings"), limitToLast(20));
    case "day":
      return query(ref(rtdb, "chick_form/readings"), limitToLast(300));
    case "week":
      return query(ref(rtdb, "chick_form/readings"), limitToLast(2100));
    case "month":
      return query(ref(rtdb, "chick_form/readings"), limitToLast(9000));
    default:
      return ref(rtdb, "chick_form/readings");
  }
};
  const chartData = useMemo(() => groupData(readings, mode), [readings, mode]);

  return (
    <Box>
      {/* Filters */}
      <Stack direction="row" spacing={1} mb={2}>
        {["hour", "day", "week", "month", "year", "all"].map(m => (
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
          {
            data: chartData.map(d => d.minTemp),
            label: "Min Temp",
          },
          {
            data: chartData.map(d => d.maxTemp),
            label: "Max Temp",
          }
        ]}
      />
    </Box>
  );
}
