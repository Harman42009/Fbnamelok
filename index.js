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

// Isme active sessions save rahenge taaki stop kar sakein
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
            // Task ID ke saath listener save karo taaki bnd ho sake
            activeListeners.set(task.id, stop);
            console.log(`✅ Task #${task.id} is now Active`);
        });
    } catch (e) { console.log("Invalid Cookie Format"); }
}

async function resumeTasks() {
    const tasks = await Task.find({});
    tasks.forEach(t => startProtection(t));
}

// --- DASHBOARD UI ---
app.get('/', async (req, res) => {
    const allTasks = await Task.find({});
    let taskListHtml = allTasks.map(t => `
        <div style="background:#0d1117; border:1px solid #30363d; padding:15px; margin-top:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
            <div style="text-align:left;">
                <b style="color:#58a6ff;">ID: ${t.id}</b><br>
                <small style="color:#8b949e;">UID: ${t.uid} | Name: ${t.name}</small>
            </div>
            <button onclick="stopTask('${t.id}')" style="background:#da3633; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer;">STOP</button>
        </div>
    `).join('');

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Deepak Rajput Brand - Manager</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { background: #0d1117; color: #c9d1d9; font-family: sans-serif; text-align: center; padding: 20px; }
                .container { max-width: 600px; margin: auto; background: #161b22; padding: 25px; border-radius: 15px; border: 1px solid #30363d; }
                input, textarea { width: 100%; padding: 10px; margin: 8px 0; background: #0d1117; border: 1px solid #30363d; color: #7ee787; border-radius: 5px; box-sizing: border-box; }
                .btn-start { background: #238636; color: white; border: none; width: 100%; padding: 12px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-bottom: 20px; }
                h2 { border-bottom: 1px solid #30363d; padding-bottom: 10px; color: #58a6ff; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Deepak Brand Manager ✅</h1>
                <input type="text" id="uid" placeholder="Group UID">
                <input type="text" id="name" placeholder="Lock Name">
                <textarea id="cookie" placeholder="Paste AppState Cookie JSON"></textarea>
                <button class="btn-start" onclick="addTask()">START NEW TASK</button>

                <h2>Running Tasks</h2>
                <div id="taskList">${taskListHtml || '<p style="color:#8b949e;">No active tasks</p>'}</div>
            </div>

            <script>
                async function addTask() {
                    const uid = document.getElementById('uid').value;
                    const name = document.getElementById('name').value;
                    const cookie = document.getElementById('cookie').value;
                    if(!uid || !name || !cookie) return alert("Fill all details!");

                    const res = await fetch('/add-task', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ cookie, uid, name })
                    });
                    const data = await res.json();
                    alert("Success! Task ID: " + data.taskId);
                    location.reload();
                }

                async function stopTask(taskId) {
                    if(!confirm("Task #" + taskId + " ko band karein?")) return;
                    const res = await fetch('/stop-task', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ taskId })
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

// API: Add Task
app.post('/add-task', async (req, res) => {
    const { cookie, uid, name } = req.body;
    const taskId = Math.floor(1000 + Math.random() * 9000).toString();
    
    const newTask = new Task({ id: taskId, cookie, uid, name });
    await newTask.save();
    startProtection(newTask);
    
    res.json({ message: "Task Started", taskId: taskId });
});

// API: Stop Task (Bnd krne ke liye)
app.post('/stop-task', async (req, res) => {
    const { taskId } = req.body;
    
    // Database se delete karo
    await Task.findOneAndDelete({ id: taskId });
    
    // Listener bnd karo agar active hai
    if (activeListeners.has(taskId)) {
        const stopFunc = activeListeners.get(taskId);
        if (typeof stopFunc === 'function') stopFunc(); 
        activeListeners.delete(taskId);
    }
    
    res.json({ message: "Task #" + taskId + " stopped and deleted!" });
});

app.listen(PORT, '0.0.0.0', () => console.log('Manager Live!'));
