import { useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  onSnapshot
} from "firebase/firestore";
import { Box, Button, Card, CardContent, Typography, Alert } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import BluetoothConnectedIcon from "@mui/icons-material/BluetoothConnected";
import BluetoothDisabledIcon from "@mui/icons-material/BluetoothDisabled";
import { db, rtdb } from "../utils/firebase";
import { rtcConfig } from "../utils/webrtc";
import { onValue, ref, set } from "firebase/database";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import StopIcon from "@mui/icons-material/Stop";

export default function Broadcaster() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [roomId, setRoomId] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Bluetooth states
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [server, setServer] = useState<BluetoothRemoteGATTServer | null>(null);
  const [characteristic, setCharacteristic] = useState<BluetoothRemoteGATTCharacteristic | null>(null);
  const [btStatus, setBtStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [btError, setBtError] = useState<string>("");

  const hasBluetooth = () => {
  return 'bluetooth' in navigator && navigator.bluetooth !== undefined;
};



  // ── Bluetooth Connection ───────────────────────────────────────────────
  const connectBluetooth = async () => {
    if (!hasBluetooth()) {
  alert("Your browser does not support Web Bluetooth or Bluetooth is turned off.");
  return;
}
    try {
      setBtStatus("connecting");
      setBtError("");

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: "ChickDispenser" }], // Must match ESP32 device name
        optionalServices: ["0000ffe0-0000-1000-8000-00805f9b34fb"] // Nordic UART service UUID
      });

      device.addEventListener("gattserverdisconnected", onDisconnected);
      setDevice(device);

      const server = await device.gatt?.connect();
      if (!server) throw new Error("Failed to connect GATT server");
      setServer(server);

      const service = await server.getPrimaryService("0000ffe0-0000-1000-8000-00805f9b34fb");
      const characteristic = await service.getCharacteristic("0000ffe1-0000-1000-8000-00805f9b34fb");
      setCharacteristic(characteristic);

      setBtStatus("connected");
    } catch (err: any) {
      console.error(err);
      setBtError(err.message || "Bluetooth connection failed");
      setBtStatus("disconnected");
    }
  };

  const onDisconnected = () => {
    setBtStatus("disconnected");
    setCharacteristic(null);
    setServer(null);
    setDevice(null);
  };

  // Send command to ESP32
  const sendCommand = async (command: string) => {
    if (!characteristic) {
      setBtError("Not connected to dispenser");
      return;
    }

    try {
      const encoder = new TextEncoder();
      await characteristic.writeValue(encoder.encode(command + "\n"));
      console.log(`Sent: ${command}`);
    } catch (err) {
      console.error("Send failed:", err);
      setBtError("Failed to send command");
    }
  };

  // ── Listen to Firebase commands ────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const commandsRef = ref(rtdb, `rooms/${roomId}/commands`);

    const unsubscribe = onValue(commandsRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.command && data?.timestamp) {
        sendCommand(data.command);
        // Optional: clear command after sending
        // set(commandsRef, null);
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  // ... (your existing startStreaming, stopStreaming, etc. code remains)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (server?.connected) {
        server.disconnect();
      }
    };
  }, [server]);

   const startStreaming = async () => {
        try {
            // ✅ MUST be inside user action (Android rule)
            const stream = await navigator.mediaDevices.getUserMedia({
                  video: {
                    facingMode: { exact: "environment" }   // ← This forces back camera
                    // Optional: Add resolution/quality constraints if needed
                    // width: { ideal: 1280 },
                    // height: { ideal: 720 },
                    // frameRate: { ideal: 30 }
                  },
                // video: true,
                audio: true
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setIsStreaming(true);
            // 2️⃣ PeerConnection
            const pc = new RTCPeerConnection(rtcConfig);
            pcRef.current = pc;

            stream.getTracks().forEach(track =>
                pc.addTrack(track, stream)
            );

            // 3️⃣ Firestore refs
            const callRef = doc(collection(db, "calls"));
            const offerCandidates = collection(callRef, "offerCandidates");
            const answerCandidates = collection(callRef, "answerCandidates");
            const roomId = callRef.id
            alert(`CALL ID: ${callRef.id}`);
            setRoomId(callRef.id);
            await set(ref(rtdb, `rooms/current`), {
                roomId,
                createdAt: Date.now(),
                status: "active"
            });
            // 4️⃣ ICE candidates
            pc.onicecandidate = e => {
                if (e.candidate) {
                    addDoc(offerCandidates, e.candidate.toJSON());
                }
            };

            // 5️⃣ Create offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            await setDoc(callRef, {
                offer: {
                    type: offer.type,
                    sdp: offer.sdp
                }
            });

            // 6️⃣ Listen for answer
            onSnapshot(callRef, snapshot => {
                const data = snapshot.data();
                if (data?.answer && !pc.currentRemoteDescription) {
                    pc.setRemoteDescription(
                        new RTCSessionDescription(data.answer)
                    );
                }
            });

            // 7️⃣ Listen for answer ICE
            onSnapshot(answerCandidates, snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === "added") {
                        pc.addIceCandidate(
                            new RTCIceCandidate(change.doc.data())
                        );
                    }
                });
            });

        } catch (err: any) {
            console.error("Streaming error:", err);

            if (err.name === 'OverconstrainedError') {
                alert("Back camera not available or permission issue. Try without 'exact' constraint?");
            } else if (err.name === 'NotAllowedError') {
                alert("Camera/Microphone permission denied. Check app settings.");
            } else {
                alert("Error: " + err.message);
            }
        }
    };

    const stopStreaming = () => {
        // stop media tracks
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }

        setIsStreaming(false);
    };
  
    
  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/")} sx={{ mb: 1 }}>
        Back to Dashboard
      </Button>

      <Card sx={{ width: { xs: "95%", sm: 500 }, m: "auto", mt: 4 }}>
        <CardContent>
          <Typography variant="h6" align="center" gutterBottom>
            Live Streaming + Dispenser Control
          </Typography>

          {/* Bluetooth Connection Button */}
          <Button
            variant="outlined"
            color={btStatus === "connected" ? "success" : "primary"}
            fullWidth
            startIcon={
              btStatus === "connected" ? <BluetoothConnectedIcon /> : <BluetoothDisabledIcon />
            }
            onClick={connectBluetooth}
            disabled={btStatus === "connecting"}
            sx={{ mb: 2 }}
          >
            {btStatus === "connecting"
              ? "Connecting..."
              : btStatus === "connected"
              ? "Bluetooth Connected"
              : "Connect to Dispenser"}
          </Button>

          {btError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {btError}
            </Alert>
          )}

          {/* Your existing Start/Stop Streaming buttons */}
          {!isStreaming ? (
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<VideocamIcon />}
              onClick={startStreaming}
              sx={{ mb: 2 }}
            >
              Start Streaming
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              fullWidth
              startIcon={<StopIcon />}
              onClick={stopStreaming}
              sx={{ mb: 2 }}
            >
              Stop Streaming
            </Button>
          )}

          {roomId && (
            <Typography variant="body2" align="center" sx={{ mb: 2 }}>
              CALL ID: <strong>{roomId}</strong>
            </Typography>
          )}

          {/* Video preview */}
          <Box sx={{ position: "relative", paddingTop: "56.25%", bgcolor: "black", borderRadius: 2 }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}