import { collection, doc, setDoc, addDoc, onSnapshot } from "firebase/firestore";
import { useEffect, useRef } from "react";
import { rtcConfig } from "../utils/webrtc";
import { db } from "../utils/firebase";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

export default function StartStream() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment", // back camera
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.error("Camera error:", err);
        alert("Camera permission denied or camera busy");
      }
    };

    startCamera();

    return () => {
      // stop camera when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div>
      <h3>Live Camera Preview</h3>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          height: "auto",
          background: "black",
        }}
      />
    </div>
  );
}
