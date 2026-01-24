export const groupData2 = (data: any, mode: any) => {
  const map: any = {};

  data.forEach((item: any) => {
    let key;

    switch (mode) {
      case "hour":
        key = item.timeDetails.time; // 20:30
        break;
      case "day":
        key = item.timeDetails.date; // 2026-01-17
        break;
      case "month":
        key = item.timeDetails.date.slice(0, 7); // 2026-01
        break;
      case "year":
        key = item.timeDetails.date.slice(0, 4); // 2026
        break;
      default:
        key = item.timeDetails.date + " " + item.timeDetails.time;
    }

    if (!map[key]) {
      map[key] = { temp: [], hum: [] };
    }

    map[key].temp.push(item.temperature);
    map[key].hum.push(item.humidity);
  });

  return Object.entries(map).map(([label, values]: any) => ({
    label,
    temperature:
      values.temp.reduce((a: any, b: any) => a + b, 0) / values.temp.length,
    humidity:
      values.hum.reduce((a: any, b: any) => a + b, 0) / values.hum.length,
  }));
};


export const groupData3 = (data: any[], mode: string) => {
  if (!data?.length) return [];

  const now = Date.now();
  let fromTime = 0;

  switch (mode) {
    case "hour":
      fromTime = now - 60 * 60 * 1000;
      break;
    case "day":
      fromTime = now - 24 * 60 * 60 * 1000;
      break;
    case "week":
      fromTime = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case "month":
      fromTime = now - 30 * 24 * 60 * 60 * 1000;
      break;
    case "year":
      fromTime = now - 365 * 24 * 60 * 60 * 1000;
      break;
    case "all":
    default:
      fromTime = 0;
  }

  // 🔥 STEP 1: filter by time
  const filtered = data.filter(
    item => item.timestamp * 1000 >= fromTime
  );

  const map: any = {};

  // 🔥 STEP 2: group + average (your logic, improved)
  filtered.forEach((item: any) => {
    let key: string;

    switch (mode) {
      case "hour":
        key = item.timeDetails.time; // HH:mm
        break;
      case "day":
      case "week":
        key = item.timeDetails.date; // YYYY-MM-DD
        break;
      case "month":
        key = item.timeDetails.date.slice(0, 7); // YYYY-MM
        break;
      case "year":
        key = item.timeDetails.date.slice(0, 4); // YYYY
        break;
      case "all":
      default:
        key = `${item.timeDetails.date} ${item.timeDetails.time}`;
    }

    if (!map[key]) {
      map[key] = { temp: [], hum: [] };
    }

    map[key].temp.push(item.temperature);
    map[key].hum.push(item.humidity);
  });

  // 🔥 STEP 3: average output (chart-ready)
  return Object.entries(map).map(([label, values]: any) => ({
    label,
    temperature:
      values.temp.reduce((a: number, b: number) => a + b, 0) /
      values.temp.length,
    humidity:
      values.hum.reduce((a: number, b: number) => a + b, 0) /
      values.hum.length,
  }));
};

export const groupData = (data: any[], mode: string) => {
  if (!data?.length) return [];

  const now = Date.now();
  let fromTime = 0;

  switch (mode) {
    case "hour":
      fromTime = now - 60 * 60 * 1000;
      break;
    case "day":
      fromTime = now - 24 * 60 * 60 * 1000;
      break;
    case "week":
      fromTime = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case "month":
      fromTime = now - 30 * 24 * 60 * 60 * 1000;
      break;
    case "year":
      fromTime = now - 365 * 24 * 60 * 60 * 1000;
      break;
    default:
      fromTime = 0;
  }

  const filtered = data.filter(
    d => d.timestamp * 1000 >= fromTime
  );

  const map: any = {};

  filtered.forEach(item => {
    let key = "";

    switch (mode) {
      case "hour":
      case "day":
        // ✅ SHOW EVERY 5-MIN POINT
        key = item.timeDetails.time; // HH:mm
        break;

      case "week":
      case "month":
        // ✅ ONE POINT PER DAY
        key = item.timeDetails.date; // YYYY-MM-DD
        break;

      case "year":
        key = item.timeDetails.date.slice(0, 7); // YYYY-MM
        break;

      default:
        key = `${item.timeDetails.date} ${item.timeDetails.time}`;
    }

    if (!map[key]) {
      map[key] = {
        temp: [],
        hum: [],
        minT: Infinity,
        maxT: -Infinity,
      };
    }

    map[key].temp.push(item.temperature);
    map[key].hum.push(item.humidity);

    // min / max tracking
    map[key].minT = Math.min(map[key].minT, item.temperature);
    map[key].maxT = Math.max(map[key].maxT, item.temperature);
  });

  return Object.entries(map).map(([label, v]: any) => ({
    label,
    temperature: v.temp.reduce((a: number, b: number) => a + b, 0) / v.temp.length,
    humidity: v.hum.reduce((a: number, b: number) => a + b, 0) / v.hum.length,
    minTemp: v.minT,
    maxTemp: v.maxT,
  }));
};
