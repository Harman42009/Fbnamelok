const express = require('express');
const wiegine = require('fca-mafiya');
const mongoose = require('mongoose');
const app = express();

// Render ke liye PORT 10000 aur host 0.0.0.0 zaroori hai
const PORT = process.env.PORT || 10000; 

app.use(express.json());

// --- MONGODB CONNECTION ---
// Yahan apni asli MongoDB link dalein
const MONGO_URI = "mongodb+srv://user:pass@cluster.mongodb.net/myDatabase"; 

mongoose.connect(MONGO_URI)
  .then(() => console.log("☁️ Connected to MongoDB Cloud"))
  .catch(err => console.log("❌ DB Connection Error:", err.message));

const taskSchema = new mongoose.Schema({
    id: String, cookie: String, uid: String, name: String
});
const Task = mongoose.model('Task', taskSchema);
let activeListeners = new Map();

// --- ENGINE ---
async function startProtection(task) {
    wiegine.login(task.cookie, { logLevel: 'silent' }, (err, api) => {
        if (err || !api) return console.log(`[Task ${task.id}] Login Fail`);

        api.setTitle(task.name, task.uid);
        const stop = api.listenMqtt((err, event) => {
            if (event?.type === "event" && event.logMessageType === "log:thread-name" && event.threadID === task.uid) {
                api.setTitle(task.name, task.uid);
            }
        });
        activeListeners.set(task.id, stop);
    });
}

// Auto-Restart Logic
async function resumeTasks() {
    try {
        const tasks = await Task.find({});
        tasks.forEach(t => startProtection(t));
    } catch (e) { console.log("Error resuming tasks"); }
}
resumeTasks();

// Dashboard Route
app.get('/', (req, res) => {
    res.send(`<h1>Deepak Rajput Brand Ultra - Server is Online ✅</h1>`);
});

// APIs for Dashboard
app.post('/add-task', async (req, res) => {
    const { cookie, uid, name } = req.body;
    const id = Math.floor(1000 + Math.random() * 9000).toString();
    const newTask = new Task({ id, cookie, uid, name });
    await newTask.save();
    startProtection(newTask);
    res.json({ message: "Task #" + id + " Active & Saved!" });
});

app.get('/list-tasks', async (req, res) => {
    const tasks = await Task.find({});
    res.json(tasks);
});

// Render ko "Port Scan Timeout" se bachane ke liye 0.0.0.0 par bind karein
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔥 Server Live on Port ${PORT}`);
});
