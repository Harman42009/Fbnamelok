const express = require('express');
const wiegine = require('fca-mafiya');
const mongoose = require('mongoose');
const app = express();

// Render settings
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;

app.use(express.json());

// --- MONGODB CONNECTION ---
mongoose.connect(MONGO_URI)
  .then(() => {
      console.log("☁️ MongoDB Connected! Deepak Rajput Brand is Live.");
      resumeTasks(); // Server restart hote hi purane tasks load honge
  })
  .catch(err => console.log("❌ DB Connection Error:", err.message));

// Task Schema
const taskSchema = new mongoose.Schema({
    id: String,
    cookie: String,
    uid: String,
    name: String
});
const Task = mongoose.model('Task', taskSchema);

let activeListeners = new Map();

// --- PROTECTION LOGIC ---
async function startProtection(task) {
    try {
        // Cookie parsing
        const appState = JSON.parse(task.cookie);
        
        wiegine({ appState }, { logLevel: 'silent', forceLogin: true }, (err, api) => {
            if (err) return console.log(`[Task ${task.id}] Login failed for UID: ${task.uid}`);

            // Pehle name set karo
            api.setTitle(task.name, task.uid);
            console.log(`✅ Protection Started for Group: ${task.uid}`);

            // Monitoring Start
            const stopListener = api.listenMqtt((err, event) => {
                if (err) return;
                
                // Agar koi name badle toh 3 sec baad wapas reset karo (Anti-Ban)
                if (event.type === "event" && event.logMessageType === "log:thread-name" && event.threadID === task.uid) {
                    console.log(`[Task ${task.id}] Name change detected! Reverting in 3s...`);
                    setTimeout(() => {
                        api.setTitle(task.name, task.uid);
                    }, 3000);
                }
            });

            activeListeners.set(task.id, stopListener);
        });
    } catch (e) {
        console.log(`[Task ${task.id}] Error: Invalid Cookie Format`);
    }
}

// Auto-Resume Function
async function resumeTasks() {
    try {
        const savedTasks = await Task.find({});
        console.log(`♻️ Resuming ${savedTasks.length} tasks from Database...`);
        savedTasks.forEach(t => startProtection(t));
    } catch (e) {
        console.log("Error resuming tasks from DB");
    }
}

// --- DASHBOARD ROUTES ---
app.get('/', (req, res) => {
    res.send(`
        <body style="background:#0d1117; color:#58a6ff; font-family:sans-serif; text-align:center; padding-top:100px;">
            <h1 style="border-bottom: 2px solid #30363d; display:inline-block; padding-bottom:10px;">Deepak Rajput Brand Ultra ✅</h1>
            <p style="color:#8b949e;">Server is Active | Database: Connected</p>
            <div style="margin-top:20px; font-weight:bold; color:#7ee787;">Bot is protecting your groups 24/7</div>
        </body>
    `);
});

// API to Add New Task
app.post('/add-task', async (req, res) => {
    const { cookie, uid, name } = req.body;
    if(!cookie || !uid || !name) return res.status(400).json({message: "Missing Data!"});

    const taskId = Math.floor(1000 + Math.random() * 9000).toString();
    
    try {
        const newTask = new Task({ id: taskId, cookie, uid, name });
        await newTask.save();
        startProtection(newTask);
        res.json({ message: `Task #${taskId} successfully started and saved to Cloud!` });
    } catch (e) {
        res.status(500).json({ message: "Database Save Error" });
    }
});

// Server Start (Binding to 0.0.0.0 for Render)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔥 Server running on Port ${PORT}`);
});
