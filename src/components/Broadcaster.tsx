import { useRef, useState } from "react";
import {
    collection,
    doc,
    setDoc,
    addDoc,
    onSnapshot
} from "firebase/firestore";
import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import { db, rtdb } from "../utils/firebase";
import { rtcConfig } from "../utils/webrtc";
import { ref, set } from "firebase/database";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import StopIcon from "@mui/icons-material/Stop";
export default function Broadcaster() {
      const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const [roomId, setRoomId] = useState('')
    const [isStreaming, setIsStreaming] = useState(false);

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
  

    const goBack = () => {
        navigate("/");
    };
    return (
        <Box>
            <Button
                startIcon={<ArrowBackIcon />}
                onClick={goBack}
                sx={{ mb: 1 }}
            >
                Back to Dashboard
            </Button>
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                pt={10}
                bgcolor="#f5f5f5"
            >


                <Card
                    sx={{
                        width: { xs: "95%", sm: 500 },
                        boxShadow: 6,
                        borderRadius: 3
                    }}
                >
                    <CardContent>
                        <Typography variant="h6" align="center" gutterBottom>
                            Live Streaming
                        </Typography>

                        {/* Start / Stop Streaming */}
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
                            <Typography
                                variant="body2"
                                align="center"
                                color="text.secondary"
                                sx={{ mb: 2 }}
                            >
                                CALL ID: <strong>{roomId}</strong>
                            </Typography>
                        )}

                        <Box
                            sx={{
                                position: "relative",
                                width: "100%",
                                paddingTop: "56.25%", // 16:9
                                backgroundColor: "black",
                                borderRadius: 2,
                                overflow: "hidden"
                            }}
                        >
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover"
                                }}
                            />
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
}
