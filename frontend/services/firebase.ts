import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

/**
 * LIFESHIELD - Unified Firebase Configuration
 * Project: SalineMonitor (salinemonitor-6a79c)
 * This unified instance handles both clinical Cloud Firestore (EHR/AI)
 * and high-frequency Realtime Database (IoT/ICU Telemetry).
 */
const firebaseConfig = {
  apiKey: "AIzaSyCdBcF0EUTuV8VQYZPNjZEtKDXX-uZMcmg",
  authDomain: "salinemonitor-6a79c.firebaseapp.com",
  databaseURL: "https://salinemonitor-6a79c-default-rtdb.firebaseio.com",
  projectId: "salinemonitor-6a79c",
  storageBucket: "salinemonitor-6a79c.firebasestorage.app",
  messagingSenderId: "35012509586",
  appId: "1:35012509586:web:23241e1e689cfda2590b4b",
  measurementId: "G-G2H63JKCEC"
};

// Initialize Unified Firebase App
const app = initializeApp(firebaseConfig);

// Export Services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);

export default app;
