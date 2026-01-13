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
    <Box
      sx={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#000",
        overflow: "hidden",
      }}
    >
      {/* Video takes full available space */}
      <Box sx={{ flex: 1, position: "relative", bgcolor: "black" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain", // ← change to "cover" if you prefer cropped fullscreen
          }}
        />

        {/* Overlay when not watching */}
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

        {/* Live indicator */}
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
              fontSize: "0.85rem",
              fontWeight: "bold",
              letterSpacing: 0.5,
            }}
          >
            LIVE
          </Box>
        )}
      </Box>

      {/* Bottom bar - optional future controls */}
      {status === "watching" && (
        <Box
          sx={{
            p: 2,
            pb: "env(safe-area-inset-bottom, 16px)",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            justifyContent: "center",
            gap: 3,
            bgcolor: "rgba(0,0,0,0.6)",
          }}
        >
          {/* You can add mute, fullscreen, etc. later */}
          <IconButton color="primary" size="large">
            <PlayArrowIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}