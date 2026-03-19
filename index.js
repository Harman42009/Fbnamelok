const express = require('express');
const wiegine = require('fca-mafiya');
const axios = require('axios');
const app = express();

// Render Port Binding
const PORT = process.env.PORT || 10000; 

app.use(express.json());

// Global tasks storage
let activeTasks = [];

// ================= KEEP ALIVE LOGIC =================
// Ye code har 2 minute mein aapke URL ko hit karega taaki Render soye nahi
setInterval(async () => {
    try {
        // Render automatically environment variable deta hai HOSTNAME ke liye
        const url = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}.onrender.com`;
        if (process.env.RENDER_EXTERNAL_HOSTNAME) {
            await axios.get(url);
            console.log('⭐ [Alive] Self-ping successful. Server is awake.');
        }
    } catch (e) {
        console.log('Ping status: Active');
    }
}, 2 * 60 * 1000); 
// =====================================================

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Deepak Rajput Brand - 24/7 Locker</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; background: #0d1117; color: #c9d1d9; padding: 20px; display: flex; flex-direction: column; align-items: center; }
                .container { width: 100%; max-width: 600px; background: #161b22; padding: 30px; border-radius: 12px; border: 1px solid #30363d; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
                h1 { text-align: center; color: #58a6ff; margin-bottom: 5px; }
                .status { font-size: 13px; color: #7ee787; text-align: center; margin-bottom: 25px; }
                .box { background: #0d1117; padding: 20px; border-radius: 8px; border: 1px solid #30363d; }
                textarea, input { width: 100%; background: #161b22; color: #7ee787; border: 1px solid #30363d; border-radius: 6px; padding: 12px; margin-bottom: 12px; box-sizing: border-box; outline: none; transition: 0.3s; }
                textarea:focus, input:focus { border-color: #58a6ff; }
                button { width: 100%; padding: 14px; background: #238636; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 16px; }
                button:hover { background: #2ea043; }
                table { width: 100%; border-collapse: collapse; margin-top: 25px; }
                th, td { padding: 12px; border: 1px solid #30363d; text-align: left; }
                th { background: #21262d; color: #58a6ff; }
                .stop-btn { background: #da3633; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Deepak Rajput Brand</h1>
                <div class="status">● System Status: 24/7 Active Mode</div>
                <div class="box">
                    <textarea id="cookie" placeholder="Paste Your Facebook Cookie..."></textarea>
                    <input type="text" id="uid" placeholder="Group/Thread UID">
                    <input type="text" id="name" placeholder="Name to Lock">
                    <button onclick="addTask()">ACTIVATE PROTECTION</button>
                </div>
                <h3>Active Monitoring</h3>
                <table>
                    <thead><tr><th>ID</th><th>Target UID</th><th>Locked Name</th><th>Action</th></tr></thead>
                    <tbody id="taskTable"></tbody>
                </table>
            </div>
            <script>
                async function addTask() {
                    const cookie = document.getElementById('cookie').value.trim();
                    const uid = document.getElementById('uid').value.trim();
                    const name = document.getElementById('name').value.trim();
                    if(!cookie || !uid || !name) return alert("Bhai, saari details bhariyo!");
                    
                    const res = await fetch('/add-task', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ cookie, uid, name })
                    });
                    const data = await res.json();
                    alert(data.message);
                    load();
                }
                async function load() {
                    const res = await fetch('/list-tasks');
                    const tasks = await res.json();
                    document.getElementById('taskTable').innerHTML = tasks.map(t => \`
                        <tr>
                            <td style="color:#ffa657">#\${t.id}</td>
                            <td>\${t.uid}</td>
                            <td>\${t.name}</td>
                            <td><button class="stop-btn" onclick="stopTask('\${t.id}')">STOP</button></td>
                        </tr>\`).join('');
                }
                async function stopTask(id) {
                    await fetch('/stop-task', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id }) });
                    load();
                }
                setInterval(load, 5000); load();
            </script>
        </body>
        </html>
    \`);
});

app.post('/add-task', (req, res) => {
    const { cookie, uid, name } = req.body;
    const taskId = Math.floor(1000 + Math.random() * 9000).toString();

    wiegine.login(cookie, { logLevel: 'silent' }, (err, api) => {
        if (err || !api) return res.json({ message: "Login Fail! Cookie check karo." });
        
        // Pehli baar set karna
        api.setTitle(name, uid);

        // Name badalte hi wapas wahi set karne ka listener
        const listener = api.listenMqtt((err, event) => {
            if (event?.type === "event" && event.logMessageType === "log:thread-name" && event.threadID === uid) {
                console.log(\`[Deepak Rajput Brand] Reverting name in \${uid}\`);
                api.setTitle(name, uid);
            }
        });

        activeTasks.push({ id: taskId, uid, name, api, listener });
        res.json({ message: "Task #" + taskId + " Started Successfully!" });
    });
});

app.get('/list-tasks', (req, res) => {
    res.json(activeTasks.map(t => ({ id: t.id, uid: t.uid, name: t.name })));
});

app.post('/stop-task', (req, res) => {
    const { id } = req.body;
    const index = activeTasks.findIndex(t => t.id === id);
    if (index !== -1) {
        if (activeTasks[index].listener) activeTasks[index].listener();
        activeTasks.splice(index, 1);
        res.json({ message: "Task #" + id + " stopped." });
    }
});

// Render requirement: 0.0.0.0 par bind karna
app.listen(PORT, '0.0.0.0', () => console.log('🔥 Server running on Port ' + PORT));
