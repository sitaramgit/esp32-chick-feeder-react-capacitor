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
import { ref, onValue, set } from "firebase/database";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { FIREBASE_COMMANDS } from "../utils/constants";
export default function Viewer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const navigate = useNavigate();
  const [callId, setCallId] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting" | "watching" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");



  const startWatching = async () => {
  if (!callId.trim()) {
    setErrorMsg("Please enter Room ID");
    return;
  }

  // Prevent multiple simultaneous connection attempts
  if (status === "connecting" || status === "watching") {
    console.log("Connection already in progress");
    return;
  }

  setStatus("connecting");
  setErrorMsg("");

  let pc: RTCPeerConnection | null = null;

  try {
    const callRef = doc(db, "calls", callId);
    const offerCandidates = collection(callRef, "offerCandidates");
    const answerCandidates = collection(callRef, "answerCandidates");

    pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    // ── Track received stream ───────────────────────────────
    pc.ontrack = (e) => {
      if (videoRef.current && e.streams?.[0]) {
        console.log("Received remote stream");
        videoRef.current.srcObject = e.streams[0];
        videoRef.current.play().catch((err) => console.error("Video play error:", err));
      }
    };

    // ── ICE candidate logging (very helpful for debugging) ──
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log("Local ICE candidate:", e.candidate.candidate);
        addDoc(answerCandidates, e.candidate.toJSON()).catch((err) =>
          console.error("Failed to save ICE candidate:", err)
        );
      } else {
        console.log("ICE gathering completed");
      }
    };

    pc.onicecandidateerror = (e) => {
      console.warn("ICE candidate error:", e);
    };

    // ── Connection state monitoring ─────────────────────────
    pc.onconnectionstatechange = () => {
      console.log(`PeerConnection state → ${pc?.connectionState}`);
      if (pc?.connectionState === "connected") {
        setStatus("watching");
      }
      if (pc?.connectionState === "failed" || pc?.connectionState === "disconnected") {
        setStatus("error");
        setErrorMsg("Connection failed or disconnected");
      }
    };

    // ── ICE connection state (more detailed) ────────────────
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state → ${pc?.iceConnectionState}`);

      if (pc?.iceConnectionState === "failed" || pc?.iceConnectionState === "disconnected") {
        if (pc.remoteDescription && pc.localDescription) {
          console.log("ICE failed/disconnected → attempting restart...");
          pc.restartIce();
        }
      }
    };

    const queuedCandidates: RTCIceCandidateInit[] = [];

    // Listen for offerer's ICE candidates
    onSnapshot(offerCandidates, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type !== "added") return;

        const data = change.doc.data();
        const candidate = new RTCIceCandidate(data);

        if (pc?.remoteDescription) {
          pc.addIceCandidate(candidate).catch((err) =>
            console.warn("Failed to add ICE candidate:", err)
          );
        } else {
          queuedCandidates.push(data);
          console.log("Queued early ICE candidate");
        }
      });
    });

    // ── Get offer from Firestore ────────────────────────────
    const callSnap = await getDoc(callRef);
    if (!callSnap.exists()) throw new Error("Room not found");

    const offer = callSnap.data()?.offer;
    if (!offer) throw new Error("No offer found in room");

    // 1. Set remote offer
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    // 2. Create answer
    const answer = await pc.createAnswer();

    // 3. Set local description (answer)
    await pc.setLocalDescription(answer);

    // 4. Send answer to Firestore
    await updateDoc(callRef, {
      answer: {
        type: answer.type,
        sdp: answer.sdp,
      },
    });
    console.log("Answer successfully sent to Firestore");

    // 5. Add any queued candidates that arrived early
    while (queuedCandidates.length > 0) {
      const data = queuedCandidates.shift()!;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data));
        console.log("Added queued early candidate");
      } catch (err) {
        console.warn("Failed to add queued candidate:", err);
      }
    }

    // Optional: Force TURN-only mode for debugging (uncomment when needed)
    // This helps determine if direct/srflx paths are the problem
    // rtcConfig.iceTransportPolicy = "relay";

  } catch (err: any) {
    console.error("Connection setup failed:", err);
    setErrorMsg(err.message || "Failed to connect to stream");
    setStatus("error");
  }


  // Cleanup on unmount / error
  return () => {
    if (pc) {
      console.log("Closing PeerConnection");
      pc.close();
      pcRef.current = null;
    }
  };
};

// Add near the top
const sendControlCommand = async (command: string) => {
  if (!callId.trim()) {
    setErrorMsg("No room ID – cannot send command");
    return;
  }

  try {
    const commandsRef = ref(rtdb, `rooms/${callId}/commands`);
    await set(commandsRef, {
      command,
      timestamp: Date.now(),
      sender: "viewer", // optional
    });
    console.log(`Sent command: ${command}`);
    setStatus(`Command sent: ${command}` as any); // temporary feedback
    setTimeout(() => setStatus("watching"), 1500);
  } catch (err: any) {
    console.error("Failed to send command:", err);
    setErrorMsg("Failed to send command");
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

  const goBack = () => {
    navigate("/");
  };

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
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={goBack}
              sx={{ mt: 2, mb: 2 }}
            >
              Back to Dashboard
            </Button>
            <Typography variant="h6" align="center" mb={3}>
              Robot Controls
            </Typography>

           <Stack spacing={2}>
  <Button
    variant="contained"
    onClick={() => sendControlCommand(FIREBASE_COMMANDS.FWD)}
  >
    ⬆️ Forward
  </Button>

  <Button
    variant="contained"
    onClick={() => sendControlCommand(FIREBASE_COMMANDS.BWD)}
  >
    ⬇️ Backward
  </Button>

  <Stack direction="row" spacing={2}>
    <Button
      variant="contained"
      onClick={() => sendControlCommand(FIREBASE_COMMANDS.LFT)}
      fullWidth
    >
      ⬅️ Rotate Left
    </Button>

    <Button
      variant="contained"
      onClick={() => sendControlCommand(FIREBASE_COMMANDS.RGT)}
      fullWidth
    >
      ➡️ Rotate Right
    </Button>
  </Stack>

  <Button
    variant="contained"
    color="success"
    onClick={() => sendControlCommand(FIREBASE_COMMANDS.FEED_ON)}
  >
    🎥 Start Feed
  </Button>

  <Button
    variant="contained"
    color="info"
    onClick={() => sendControlCommand(FIREBASE_COMMANDS.WATER_ON)}
  >
    💧 Start Water
  </Button>
</Stack>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

const ControlButton = ({ label, command, onClick }: { 
  label: string; 
  command?: string; 
  onClick?: any
}) => (
  <Button
    variant="contained"
    fullWidth
    size="large"
    onClick={onClick(command)}
    sx={{
      py: 2,
      fontWeight: "bold",
      borderRadius: 2,
    }}
  >
    {label}
  </Button>
);