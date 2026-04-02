
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyCdBcF0EUTuV8VQYZPNjZEtkDXX-uZMcmg",
    authDomain: "salinemonitor-6a79c.firebaseapp.com",
    databaseURL: "https://salinemonitor-6a79c-default-rtdb.firebaseio.com",
    projectId: "salinemonitor-6a79c",
    storageBucket: "salinemonitor-6a79c.appspot.com",
};

// Initialize defined named app for Saline Integrated module to prevent conflict with default app
const app = getApps().find(a => a.name === "salineIntegratedApp") 
    ? getApp("salineIntegratedApp") 
    : initializeApp(firebaseConfig, "salineIntegratedApp");

export const database = getDatabase(app);

