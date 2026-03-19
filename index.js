const express = require('express');
const wiegine = require('fca-mafiya');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// --- MONGODB CONNECTION ---
const MONGO_URI = process.env.MONGO_URI; 

mongoose.connect(MONGO_URI)
  .then(() => {
      console.log("☁️ Connected to MongoDB Cloud");
      resumeTasks(); // Server start hote hi purane tasks wapas chalu
  })
  .catch(err => console.log("❌ DB Error:", err.message));

const taskSchema = new mongoose.Schema({
    id: String, cookie: String, uid: String, name: String
});
const Task = mongoose.model('Task', taskSchema);
let activeListeners = new Map();

// --- PROTECTION ENGINE ---
async function startProtection(task) {
    try {
        wiegine({ appState: JSON.parse(task.cookie) }, { logLevel: 'silent' }, (err, api) => {
            if (err) return console.log(`[Task ${task.id}] Login Fail`);

            api.setTitle(task.name, task.uid);
            const stop = api.listenMqtt((err, event) => {
                if (event?.type === "event" && event.logMessageType === "log:thread-name" && event.threadID === task.uid) {
                    setTimeout(() => api.setTitle(task.name, task.uid), 3000);
                }
            });
            activeListeners.set(task.id, stop);
            console.log(`✅ Task #${task.id} is now Active!`);
        });
    } catch (e) { console.log("Error in Protection Engine"); }
}

async function resumeTasks() {
    const tasks = await Task.find({});
    console.log(`♻️ Resuming ${tasks.length} tasks from Database...`);
    tasks.forEach(t => startProtection(t));
}

// Dashboard
app.get('/', (req, res) => {
    res.send(`<body style="background:#0d1117;color:#58a6ff;text-align:center;"><h1>Deepak Rajput Brand Ultra ✅</h1><p>DB Connected & Auto-Resume Active</p></body>`);
});

// Add Task API
app.post('/add-task', async (req, res) => {
    const { cookie, uid, name } = req.body;
    const id = Math.floor(1000 + Math.random() * 9000).toString();
    
    const newTask = new Task({ id, cookie, uid, name });
    await newTask.save();
    startProtection(newTask);
    
    res.json({ message: "Task #" + id + " Saved & Started!" });
});

app.listen(PORT, '0.0.0.0', () => console.log(`🔥 Live on ${PORT}`));
