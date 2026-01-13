import { doc, getDoc, collection, addDoc, onSnapshot, updateDoc } from "firebase/firestore";

import { useRef, useState } from "react";
import { rtcConfig } from "../utils/webrtc";
import { db } from "../utils/firebase";

export default function WatchStream() {
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const [roomId, setRoomId] = useState("");

  const join = async () => {
    const pc = new RTCPeerConnection(rtcConfig);

    pc.ontrack = e => {
      remoteVideo.current!.srcObject = e.streams[0];
    };

    const roomRef = doc(db, "rooms", roomId);
    const roomSnap = await getDoc(roomRef);
    const roomData = roomSnap.data();

    const answerCandidates = collection(roomRef, "answerCandidates");
    const offerCandidates = collection(roomRef, "offerCandidates");

    pc.onicecandidate = e => {
      if (e.candidate) addDoc(answerCandidates, e.candidate.toJSON());
    };

    await pc.setRemoteDescription(
      new RTCSessionDescription(roomData!.offer)
    );

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await updateDoc(roomRef, { answer });

    onSnapshot(offerCandidates, snap => {
      snap.docChanges().forEach(change => {
        if (change.type === "added") {
          pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
        }
      });
    });
  };

  return (
    <> <div style={{margin: '20px'}}>
      <input
        placeholder="Enter Room ID"
        value={roomId}
        onChange={e => setRoomId(e.target.value)}
      />
      <button onClick={join}>Watch</button>
      <video ref={remoteVideo} autoPlay playsInline />
      </div>
    </>
  );
}
