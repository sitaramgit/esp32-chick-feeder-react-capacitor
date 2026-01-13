import { collection, doc, setDoc, addDoc, onSnapshot } from "firebase/firestore";
import { useRef } from "react";
import { rtcConfig } from "../utils/webrtc";
import { db } from "../utils/firebase";

export default function StartStream_bkp() {
  const localVideo = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = async () => {
    try {
      // 1️⃣ Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true
      });

      streamRef.current = stream;
      localVideo.current!.srcObject = stream;

      // 2️⃣ Create PeerConnection
      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // 3️⃣ Firestore room
      const roomRef = doc(collection(db, "rooms"));
      const offerCandidates = collection(roomRef, "offerCandidates");
      const answerCandidates = collection(roomRef, "answerCandidates");

      // 4️⃣ ICE candidates
      pc.onicecandidate = event => {
        if (event.candidate) {
          addDoc(offerCandidates, event.candidate.toJSON());
        }
      };

      // 5️⃣ Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await setDoc(roomRef, {
        offer: {
          type: offer.type,
          sdp: offer.sdp
        }
      });

      // 6️⃣ Listen for answer
      onSnapshot(roomRef, snapshot => {
        const data = snapshot.data();
        if (data?.answer && !pc.currentRemoteDescription) {
          pc.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        }
      });

      // 7️⃣ Listen for ICE from viewer
      onSnapshot(answerCandidates, snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === "added") {
            pc.addIceCandidate(
              new RTCIceCandidate(change.doc.data())
            );
          }
        });
      });

      alert(`Room ID: ${roomRef.id}`);
    } catch (err) {
      console.error("Camera error:", err);
      alert("Camera / Mic permission denied or device busy");
    }
  };

  // 8️⃣ Cleanup (VERY IMPORTANT)
  const stop = () => {
    pcRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  return (
    <>
    <div style={{marginTop: '50px'}}></div>
      <button onClick={start}>Start Stream</button>
      <button onClick={stop}>Stop</button>

      <video
        ref={localVideo}
        autoPlay
        muted
        playsInline
        style={{ width: "100%" }}
      />
    </>
  );
}
