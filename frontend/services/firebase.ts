import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBSkwvStn0ToMZrMB2Ren8H069fgorQAVk",
    authDomain: "ai-summit-2e5a7.firebaseapp.com",
    projectId: "ai-summit-2e5a7",
    storageBucket: "ai-summit-2e5a7.firebasestorage.app",
    messagingSenderId: "469164085940",
    appId: "1:469164085940:web:1b06a300222a491e75fde1",
    measurementId: "G-G2H63JKCEC"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
