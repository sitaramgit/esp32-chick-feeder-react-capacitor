import { useRef, useState } from "react";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  onSnapshot
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { rtcConfig } from "../utils/webrtc";

export default function Broadcaster() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
const [roodId, setRoomId] = useState('')
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
  audio: true
});

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

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

      alert(`CALL ID: ${callRef.id}`);
setRoomId(callRef.id);
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

  return (
    <>
      <button onClick={startStreaming} style={{ marginTop: '50px'}}>
        Start Streaming
      </button>
    <p>{`CALL ID: ${roodId}`}</p>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: "100%", background: "black" }}
      />
    </>
  );
}
