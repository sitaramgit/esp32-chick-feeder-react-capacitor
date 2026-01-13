import { useEffect, useRef, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  updateDoc
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { rtcConfig } from "../utils/webrtc";

export default function Viewer() {
  const videoRef = useRef<HTMLVideoElement>(null);
const [callId, setCallerId] = useState<string>('')

const start = async () => {
      const callRef = doc(db, "calls", callId);
      const offerCandidates = collection(callRef, "offerCandidates");
      const answerCandidates = collection(callRef, "answerCandidates");

      const pc = new RTCPeerConnection(rtcConfig);

      pc.ontrack = e => {
        if (videoRef.current) {
          videoRef.current.srcObject = e.streams[0];
        }
      };

      pc.onicecandidate = e => {
        if (e.candidate) {
          addDoc(answerCandidates, e.candidate.toJSON());
        }
      };

      // 1️⃣ Get offer
      const callSnap = await getDoc(callRef);
      const offer = callSnap.data()?.offer;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // 2️⃣ Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await updateDoc(callRef, {
        answer: {
          type: answer.type,
          sdp: answer.sdp
        }
      });

      // 3️⃣ Offer ICE
      onSnapshot(offerCandidates, snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === "added") {
            pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
          }
        });
      });
    };
  return (
  <>
    <input
        placeholder="Enter Room ID"
        value={callId}
        onChange={e => setCallerId(e.target.value)}
      />
      <button onClick={start}>Watch</button>
    <video
      ref={videoRef}
      autoPlay
      playsInline
      style={{ width: "100%" }}
    />
  </>
  );
}
