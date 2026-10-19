import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import EggAltIcon from "@mui/icons-material/EggAlt";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import SensorsIcon from "@mui/icons-material/Sensors";
import { onAuthStateChanged } from "firebase/auth";
import { auth, loginWithGoogle } from "../utils/firebase";

type AuthGateProps = {
  children: React.ReactNode;
};

const AuthGate = ({ children }: AuthGateProps) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      setAuthError(error?.message || "Google sign-in failed");
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at top, #f1faef 0%, #eaf6ef 42%, #f6f9ff 100%)",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress size={52} thickness={4} color="success" />
          <Typography variant="h6" sx={{ mt: 2, fontWeight: 700, color: "#1d3a2a" }}>
            Loading your flock dashboard...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
          py: 4,
          background: "linear-gradient(135deg, #f7fbf3 0%, #edf9f1 35%, #ebf3ff 100%)",
        }}
      >
        <Card
          sx={{
            width: "100%",
            maxWidth: 980,
            borderRadius: 5,
            overflow: "hidden",
            boxShadow: "0 22px 60px rgba(25, 68, 42, 0.12)",
            border: "1px solid rgba(20, 90, 55, 0.08)",
          }}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" }, minHeight: 620 }}>
            <Box
              sx={{
                p: { xs: 3, md: 5 },
                background: "linear-gradient(160deg, #173f2d 0%, #1d5541 45%, #2a6c42 100%)",
                color: "#f5fff8",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Chip
                icon={<EggAltIcon />}
                label="Smart poultry monitoring"
                sx={{
                  alignSelf: "flex-start",
                  bgcolor: "rgba(255,255,255,0.12)",
                  color: "#f3fff4",
                  border: "1px solid rgba(255,255,255,0.22)",
                  fontWeight: 700,
                  mb: 3,
                }}
              />

              <Typography variant="h2" sx={{ fontWeight: 900, lineHeight: 1.05, mb: 2 }}>
                Grow chickens with IoT.
              </Typography>

              <Typography variant="body1" sx={{ maxWidth: 540, color: "rgba(255,255,255,0.82)", fontSize: "1.04rem", mb: 3 }}>
                Track climate, water, feeding, lighting, and flock health from one clean control center designed for modern poultry farms.
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 4 }}>
                <Box sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>Live sensors</Typography>
                  <Typography fontWeight={700}>Temp • Humidity • Soil</Typography>
                </Box>
                <Box sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>Automation</Typography>
                  <Typography fontWeight={700}>Pump • Bulbs • Feeder</Typography>
                </Box>
              </Stack>

              <Divider sx={{ borderColor: "rgba(255,255,255,0.16)", mb: 3 }} />

              <Stack spacing={1.5}>
                { [
                  [<CloudDoneIcon key="cloud" fontSize="small" />, "Cloud-connected farm monitoring"],
                  [<SensorsIcon key="sensor" fontSize="small" />, "Automatic alerts and live device status"],
                  [<EggAltIcon key="egg" fontSize="small" />, "Better flock care with smarter feeding"],
                ].map(([icon, text], index) => (
                  <Stack key={index} direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.12)" }}>
                      {icon}
                    </Box>
                    <Typography sx={{ color: "rgba(255,255,255,0.9)" }}>{text}</Typography>
                  </Stack>
                )) }
              </Stack>
            </Box>

            <Box sx={{ p: { xs: 3, md: 5 }, display: "flex", alignItems: "center", justifyContent: "center", background: "#f6fbf7" }}>
              <Card sx={{ width: "100%", maxWidth: 390, borderRadius: 4, boxShadow: "0 12px 28px rgba(23, 63, 45, 0.08)", border: "1px solid rgba(18,92,60,0.08)" }}>
                <CardContent sx={{ p: 3.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                    <Box sx={{ width: 70, height: 70, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #dff7e5 0%, #cfe7d8 100%)", color: "#1f5e36" }}>
                      <EggAltIcon sx={{ fontSize: 34 }} />
                    </Box>
                  </Box>

                  <Typography variant="overline" sx={{ color: "success.main", fontWeight: 800, letterSpacing: 1.3 }}>
                    Secure access
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#1a2f22", mb: 1 }}>
                    Chick Farm Automation
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                    Sign in with Google to monitor your poultry environment, control irrigation and lighting, and manage feeding automatically.
                  </Typography>

                  <Button
                    fullWidth
                    size="large"
                    variant="contained"
                    startIcon={<GoogleIcon />}
                    onClick={handleGoogleLogin}
                    sx={{
                      borderRadius: 3,
                      py: 1.4,
                      fontWeight: 700,
                      background: "linear-gradient(135deg, #1b6b43 0%, #2e8b5d 100%)",
                      boxShadow: "0 12px 22px rgba(27, 107, 67, 0.22)",
                      "&:hover": { background: "linear-gradient(135deg, #145935 0%, #256d49 100%)" },
                    }}
                  >
                    Sign in with Google
                  </Button>

                  {authError && (
                    <Typography color="error" sx={{ mt: 2, fontWeight: 600, textAlign: "center" }}>
                      {authError}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Card>
      </Box>
    );
  }

  return <>{children}</>;
};

export default AuthGate;
