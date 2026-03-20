const express = require('express');
const wiegine = require('fca-mafiya');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// ================= SETUP AREA =================
// Kal yahan apni details bhar dena, bot apne aap start ho jayega
const autoTasks = [
    {
        cookie: "APNI_COOKIE_DAALEIN",
        uid: "GROUP_UID_DAALEIN",
        name: "DEEPAK RAJPUT BRAND"
    }
];
// ==============================================

let activeTasks = [];

function startBot(task, isAuto = false) {
    const taskId = isAuto ? "AUTO-" + Math.floor(100 + Math.random() * 900) : Math.floor(1000 + Math.random() * 9000).toString();
    
    wiegine.login(task.cookie, { logLevel: 'silent' }, (err, api) => {
        if (err || !api) return console.log("❌ Login Fail for UID: " + task.uid);
        
        api.setTitle(task.name, task.uid);
        const listener = api.listenMqtt((err, event) => {
            if (event?.type === "event" && event.logMessageType === "log:thread-name" && event.threadID === task.uid) {
                api.setTitle(task.name, task.uid);
            }
        });
        activeTasks.push({ id: taskId, uid: task.uid, name: task.name, api, listener });
        console.log("✅ Task Active: " + taskId);
    });
}

// Auto-Start on Boot (Restart proof)
autoTasks.forEach(t => startBot(t, true));

// Self-Ping to stay awake
setInterval(() => {
    const url = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}.onrender.com`;
    if(process.env.RENDER_EXTERNAL_HOSTNAME) axios.get(url).catch(()=>{});
}, 2 * 60 * 1000);

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>Deepak Rajput Brand</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { background: #0d1117; color: #c9d1d9; font-family: sans-serif; padding: 15px; }
                .container { width: 100%; max-width: 450px; margin: auto; }
                h1 { color: #58a6ff; text-align: center; font-size: 22px; margin: 20px 0; }
                .task-card { 
                    background: #161b22; border: 1px solid #30363d; border-radius: 12px; 
                    padding: 15px; margin-bottom: 15px; display: flex; 
                    justify-content: space-between; align-items: center; 
                }
                .task-info b { color: #7ee787; display: block; margin-bottom: 4px; font-size: 14px; }
                .task-info span { color: #8b949e; font-size: 12px; }
                .stop-btn { 
                    background: #da3633; color: white; border: none; padding: 10px 18px; 
                    border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Deepak Rajput Brand</h1>
                <div id="taskList"></div>
            </div>
            <script>
                async function loadTasks() {
                    const res = await fetch('/list-tasks');
                    const tasks = await res.json();
                    const listDiv = document.getElementById('taskList');
                    listDiv.innerHTML = tasks.length === 0 ? '<p style="text-align:center">No active tasks.</p>' : 
                    tasks.map(t => \`
                        <div class="task-card">
                            <div class="task-info"><b>\${t.name}</b><span>UID: \${t.uid}</span></div>
                            <button class="stop-btn" onclick="stopTask('\${t.id}')">STOP</button>
                        </div>\`).join('');
                }
                async function stopTask(id) {
                    if(!confirm("Band kar dein?")) return;
                    await fetch('/stop-task', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id }) });
                    loadTasks();
                }
                setInterval(loadTasks, 5000); loadTasks();
            </script>
        </body>
        </html>
    `);
});

app.get('/list-tasks', (req, res) => res.json(activeTasks.map(t => ({ id: t.id, uid: t.uid, name: t.name }))));

app.post('/stop-task', (req, res) => {
    const { id } = req.body;
    const index = activeTasks.findIndex(t => t.id === id);
    if (index !== -1) {
        if (activeTasks[index].listener) activeTasks[index].listener();
        activeTasks.splice(index, 1);
        res.json({ success: true });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log('Server Live'));
