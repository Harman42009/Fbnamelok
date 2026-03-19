const express = require('express');
const wiegine = require('fca-mafiya');
const mongoose = require('mongoose');
const app = express();

const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;

app.use(express.json());

// --- MONGODB CONNECTION ---
mongoose.connect(MONGO_URI)
  .then(() => {
      console.log("☁️ MongoDB Connected!");
      resumeTasks();
  })
  .catch(err => console.log("❌ DB Error:", err.message));

const taskSchema = new mongoose.Schema({
    id: String, cookie: String, uid: String, name: String
});
const Task = mongoose.model('Task', taskSchema);
let activeListeners = new Map();

// --- ENGINE ---
async function startProtection(task) {
    try {
        const appState = JSON.parse(task.cookie);
        wiegine({ appState }, { logLevel: 'silent', forceLogin: true }, (err, api) => {
            if (err) return console.log(`[Task ${task.id}] Login Fail`);

            api.setTitle(task.name, task.uid);
            const stop = api.listenMqtt((err, event) => {
                if (event?.type === "event" && event.logMessageType === "log:thread-name" && event.threadID === task.uid) {
                    setTimeout(() => api.setTitle(task.name, task.uid), 3000);
                }
            });
            activeListeners.set(task.id, stop);
        });
    } catch (e) { console.log("Invalid Cookie Format"); }
}

async function resumeTasks() {
    const tasks = await Task.find({});
    tasks.forEach(t => startProtection(t));
}

// --- HACKER DASHBOARD UI ---
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Deepak Rajput Brand Ultra</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { background: #0d1117; color: #c9d1d9; font-family: 'Segoe UI', sans-serif; text-align: center; padding: 20px; }
                .container { max-width: 500px; margin: auto; background: #161b22; padding: 30px; border-radius: 15px; border: 1px solid #30363d; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                h1 { color: #58a6ff; text-transform: uppercase; letter-spacing: 2px; }
                input, textarea { width: 100%; padding: 12px; margin: 10px 0; background: #0d1117; border: 1px solid #30363d; color: #7ee787; border-radius: 8px; box-sizing: border-box; }
                button { width: 100%; padding: 15px; background: #238636; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 16px; margin-top: 10px; }
                button:hover { background: #2ea043; }
                .status { margin-top: 20px; font-size: 14px; color: #8b949e; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Deepak Brand Ultra ✅</h1>
                <p style="color:#7ee787">Database & Server: ONLINE</p>
                
                <input type="text" id="uid" placeholder="Enter Group UID (e.g. 12345678)">
                <input type="text" id="name" placeholder="Name to Lock (e.g. Deepak Brand ✅)">
                <textarea id="cookie" rows="5" placeholder="Paste your AppState Cookie here..."></textarea>
                
                <button onclick="addTask()">START PROTECTION</button>
                
                <div class="status">Bot is protecting your groups 24/7</div>
            </div>

            <script>
                async function addTask() {
                    const uid = document.getElementById('uid').value.trim();
                    const name = document.getElementById('name').value.trim();
                    const cookie = document.getElementById('cookie').value.trim();
                    
                    if(!uid || !name || !cookie) return alert("Bhai, saare box bharo!");

                    const res = await fetch('/add-task', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ cookie, uid, name })
                    });
                    const data = await res.json();
                    alert(data.message);
                    location.reload();
                }
            </script>
        </body>
        </html>
    `);
});

app.post('/add-task', async (req, res) => {
    const { cookie, uid, name } = req.body;
    const id = Math.floor(1000 + Math.random() * 9000).toString();
    const newTask = new Task({ id, cookie, uid, name });
    await newTask.save();
    startProtection(newTask);
    res.json({ message: "Task #" + id + " Active & Saved to Cloud!" });
});

app.listen(PORT, '0.0.0.0', () => console.log('Deepak Brand Ultra Live!'));
