import { useNavigate } from "react-router-dom";

export const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <h2>Dashboard</h2>

      <div style={styles.card}>
        <h3>React Course</h3>
        <p>Learn React step by step</p>

        <div style={styles.actions}>
          <button onClick={() => navigate("/start")} style={styles.startBtn}>
            Start
          </button>
          <button onClick={() => navigate("/watch")} style={styles.watchBtn}>
            Watch
          </button>
        </div>
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