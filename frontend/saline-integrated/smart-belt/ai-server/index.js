const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const { EventSource } = require('eventsource');
const { ANALYSIS_PROMPT } = require('./prompts');

const app = express();
const PORT = process.env.PORT || 5001;
const OLLAMA_API = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'llama3.2:latest';
const FIREBASE_DB_URL = "https://salinemonitor-6a79c-default-rtdb.firebaseio.com";

app.use(cors());
app.use(bodyParser.json());

// --- AI LOGIC ---
const processingMap = new Map();

async function queryOllama(prompt) {
    try {
        const response = await axios.post(OLLAMA_API, {
            model: MODEL_NAME,
            prompt: prompt,
            stream: false,
            format: 'json'
        });
        return JSON.parse(response.data.response);
    } catch (error) {
        // console.error('Ollama Query Error:', error.message);
        return null;
    }
}

async function analyzeAndWriteBack(deviceId, data) {
    // REAL-TIME OPTIMIZATION:
    // If we represent TRUE real-time, we must not queue.
    // If the engine is busy with Frame 1, and Frame 2, 3, 4 arrive,
    // we should drop 2 and 3 and pick up 4 immediately when 1 is done.
    // However, here we simplisticly drop if busy. The next frame will be caught.
    if (processingMap.get(deviceId)) {
        return; // Drop frame to maintain real-time sync
    }

    processingMap.set(deviceId, true);
    const start = Date.now();

    try {
        // 1. Get metadata/profile if exists (Cache this in production!)
        let profile = "General Patient Profile";
        try {
            const metaRes = await axios.get(`${FIREBASE_DB_URL}/live/devices/${deviceId}/metadata.json`);
            if (metaRes.data) {
                const m = metaRes.data;
                profile = `Name: ${m.name}, Age: ${m.age}, Condition: ${m.medical_problem}, Weight: ${m.weight}, Height: ${m.height}`;
            }
        } catch (e) { }

        // 2. Build Prompt
        const prompt = ANALYSIS_PROMPT
            .replace('{bpm}', data.bpm || 0)
            .replace('{spo2}', data.spo2 || 0)
            .replace('{temp}', data.temperature || data.temp || 0)
            .replace('{activity}', data.activity_index || data.activity || 0)
            .replace('{wearing}', data.ir_val > 20000 ? 'YES' : 'NO')
            .replace('{profile}', profile);

        // 3. Query AI
        const result = await queryOllama(prompt);

        // 4. Write back to Firebase
        if (result) {
            await axios.put(`${FIREBASE_DB_URL}/live/devices/${deviceId}/analysis.json`, {
                ...result,
                timestamp: Date.now(),
                latency: Date.now() - start
            });
            console.log(`[AI] Analysis updated for ${deviceId}: ${result.status} (${Date.now() - start}ms)`);
        }
    } catch (e) {
        console.error("Analysis Pipeline Error:", e.message);
    } finally {
        processingMap.set(deviceId, false);
    }
}

// --- FIREBASE SUBSCRIPTION ---
function subscribeToDevice(deviceId) {
    if (activeSubscriptions.has(deviceId)) return;

    console.log(`[AI] Subscribing to live stream for device: ${deviceId}`);
    const es = new EventSource(`${FIREBASE_DB_URL}/live/devices/${deviceId}.json`);

    const handleUpdate = (data) => {
        if (!data) return;
        analyzeAndWriteBack(deviceId, data);
    };

    es.addEventListener('patch', (e) => {
        const payload = JSON.parse(e.data);
        if (payload.path === '/' && payload.data) {
            handleUpdate(payload.data);
        } else {
            // Incremental update - in a true real-time system with flat data, 
            // we might want to fetch full state or merge. 
            // For now, simpler to ignore or re-fetch if needed.
            // But to be fast, we assume the stream sends full frames often.
        }
    });

    es.addEventListener('put', (e) => {
        const payload = JSON.parse(e.data);
        if (payload.path === '/' && payload.data) {
            handleUpdate(payload.data);
        }
    });

    es.onerror = (err) => {
        // Quiet falloff
    };

    activeSubscriptions.set(deviceId, es);
}

// REST Endpoints for Control
app.post('/ai/monitor', (req, res) => {
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).send("No deviceId");
    subscribeToDevice(deviceId);
    res.json({ message: `Monitoring enabled for ${deviceId}` });
});

app.get('/ai/status', (req, res) => {
    res.json({ online: true, model: MODEL_NAME, monitoring: Array.from(activeSubscriptions.keys()) });
});

// Sync all existing devices on startup
async function syncExistingDevices() {
    try {
        console.log("[AI] Searching for existing devices in Firebase...");
        const res = await axios.get(`${FIREBASE_DB_URL}/live/devices.json?shallow=true`);
        if (res.data) {
            const deviceIds = Object.keys(res.data);
            console.log(`[AI] Found ${deviceIds.length} potentially active devices.`);
            deviceIds.forEach(id => subscribeToDevice(id));
        }
    } catch (e) {
        console.error("[AI] Failed to sync existing devices:", e.message);
    }
}

function startHeartbeat() {
    setInterval(() => {
        axios.put(`${FIREBASE_DB_URL}/server_status/ai.json`, {
            status: 'online',
            last_seen: Date.now(),
            active_streams: activeSubscriptions.size
        }).catch(() => { });
    }, 5000);
}

app.listen(PORT, () => {
    console.log(`Smart Belt AI Server running on port ${PORT}`);
    startHeartbeat();
    syncExistingDevices();
});
