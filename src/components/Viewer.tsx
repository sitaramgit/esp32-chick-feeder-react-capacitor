import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Stack,
  Typography,
  Paper,
  CircularProgress,
  IconButton,
  InputAdornment,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { doc, getDoc, collection, addDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db, rtdb } from "../utils/firebase";
import { rtcConfig } from "../utils/webrtc";
import { ref, onValue } from "firebase/database";
export default function Viewer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const [callId, setCallId] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting" | "watching" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");



  const startWatching = async () => {
    console.log(99)


    if (!callId.trim()) {
      setErrorMsg("Please enter Room ID");
      return;
    }

    setStatus("connecting");
    setErrorMsg("");

    try {
      const callRef = doc(db, "calls", callId);
      const offerCandidates = collection(callRef, "offerCandidates");
      const answerCandidates = collection(callRef, "answerCandidates");

      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      pc.ontrack = (e) => {
        if (videoRef.current) {
          videoRef.current.srcObject = e.streams[0];
          videoRef.current.play().catch(console.error);
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          addDoc(answerCandidates, e.candidate.toJSON()).catch(console.error);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setStatus("watching");
        } else if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          setStatus("error");
          setErrorMsg("Connection lost");
        }
      };

      // Get offer
      const callSnap = await getDoc(callRef);
      if (!callSnap.exists()) throw new Error("Room not found");

      const offer = callSnap.data()?.offer;
      if (!offer) throw new Error("No offer found");

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Create & set answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await updateDoc(callRef, {
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        },
      });

      // Handle offer ICE candidates
      onSnapshot(offerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(console.error);
          }
        });
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to connect");
      setStatus("error");
    }
  };

  // Cleanup
  useEffect(() => {
        onValue(ref(rtdb, "rooms/current"), snapshot => {
  if (snapshot.exists()) {
    console.log("Current room:", snapshot.val().roomId);
    setCallId(snapshot.val().roomId)
  }
});

    return () => {
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  return (
     <Box sx={{ height: "100dvh", bgcolor: "#000" }}>
    <Box
      sx={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",          // mobile
          md: "2.5fr 1fr",    // desktop / tablet
        },
        gridTemplateRows: {
          xs: "1fr 1fr",      // mobile: video 50%, controls 50%
          md: "1fr",          // desktop: side-by-side
        },
      }}
    >
      {/* 🎥 CAMERA VIEW */}
      <Box sx={{ position: "relative", bgcolor: "black" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
        {status !== "watching" && (
          <Paper
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              p: 4,
              bgcolor: "rgba(0,0,0,0.75)",
              color: "white",
              borderRadius: 0,
            }}
            elevation={0}
          >
            <Typography variant="h4" component="h1" sx={{ color: "white", mb: 2 }}>
              Remote Viewer
            </Typography>

            <Stack spacing={3} sx={{ width: "100%", maxWidth: 400 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Enter Room ID / Call ID"
                size="medium"
                value={callId}
                onChange={(e) => setCallId(e.target.value.trim())}
                onKeyDown={(e) => e.key === "Enter" && startWatching()}
                InputProps={{
                  sx: { bgcolor: "rgba(255,255,255,0.1)", color: "white" },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "rgba(255,255,255,0.5)" },
                    "&:hover fieldset": { borderColor: "white" },
                    "&.Mui-focused fieldset": { borderColor: "#1976d2" },
                  },
                  "& .MuiInputBase-input": { color: "white" },
                  "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.7)" },
                }}
              />

              <Button
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                disabled={status === "connecting"}
                onClick={startWatching}
                startIcon={
                  status === "connecting" ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />
                }
              >
                {status === "connecting" ? "Connecting..." : "Watch Stream"}
              </Button>

              {errorMsg && (
                <Typography color="error" align="center" sx={{ mt: 1 }}>
                  {errorMsg}
                </Typography>
              )}
            </Stack>
          </Paper>
        )}

        {status === "watching" && (
          <Box
            sx={{
              position: "absolute",
              top: 16,
              left: 16,
              bgcolor: "success.main",
              color: "white",
              px: 1.5,
              py: 0.5,
              borderRadius: 12,
              fontWeight: "bold",
            }}
          >
            LIVE
          </Box>
        )}
      </Box>

      {/* 🎮 CONTROL PANEL */}
      <Box
        sx={{
          bgcolor: "#111",
          p: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 3,
            bgcolor: "#1c1c1c",
            color: "white",
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" align="center" mb={3}>
            Robot Controls
          </Typography>

          <Stack spacing={2}>
            <ControlButton label="⬆️ Forward" />
            <ControlButton label="⬇️ Backward" />

            <Stack direction="row" spacing={2}>
              <ControlButton label="⬅️ Rotate Left" />
              <ControlButton label="➡️ Rotate Right" />
            </Stack>

            <ControlButton label="🎥 Start Feed" />
            <ControlButton label="💧 Start Water" />
          </Stack>
        </Paper>
      </Box>
    </Box>
  </Box>
  );
}

const ControlButton = ({ label, onClick }: { label: string; onClick?: () => void }) => (
  <Button
    variant="contained"
    fullWidth
    size="large"
    onClick={onClick}
    sx={{
      py: 2,
      fontWeight: "bold",
      borderRadius: 2,
    }}
  >
    {label}
  </Button>
);