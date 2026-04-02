
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PatientProvider } from './core/patientContext/patientStore';
import './saline-integrated/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <PatientProvider>
      <App />
    </PatientProvider>
  </React.StrictMode>
);
