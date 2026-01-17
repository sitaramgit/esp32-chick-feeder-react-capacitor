export const groupData = (data: any, mode: any) => {
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
