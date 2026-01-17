import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDe8Jbt1lxmVLPHr65ZucM--qIFE4D_v_s",
  authDomain: "iot-testing-68711.firebaseapp.com",
  databaseURL: "https://iot-testing-68711-default-rtdb.firebaseio.com",
  projectId: "iot-testing-68711",
  storageBucket: "iot-testing-68711.firebasestorage.app",
  messagingSenderId: "635939795534",
  appId: "1:635939795534:web:a61a9af244b75d840e891f"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const rtdb = getDatabase(app);
