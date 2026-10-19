import { useEffect, useState } from "react";
import { Box, Button, Card, CardContent, CircularProgress, Typography } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
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
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f1f8f3 0%, #edf6ff 100%)" }}>
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Checking access...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f4f9f3 0%, #eef7ff 100%)", p: 2 }}>
        <Card sx={{ maxWidth: 460, width: "100%", borderRadius: 4, boxShadow: 6 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: 1.5 }}>
              Secure access
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              Chick Farm Automation
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Sign in with Google to access your live farm dashboard and controls.
            </Typography>

            <Button
              fullWidth
              size="large"
              variant="contained"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleLogin}
              sx={{ borderRadius: 3, py: 1.5 }}
            >
              Sign in with Google
            </Button>

            {authError && (
              <Typography color="error" sx={{ mt: 2 }}>
                {authError}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  }

  return <>{children}</>;
};

export default AuthGate;
