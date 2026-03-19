const express = require('express');
const wiegine = require('fca-mafiya');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000; 

app.use(express.json());
let activeTasks = [];

// Keep Alive Logic
setInterval(async () => {
    try {
        const url = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}.onrender.com`;
        if (process.env.RENDER_EXTERNAL_HOSTNAME) await axios.get(url);
    } catch (e) {}
}, 2 * 60 * 1000);

// HTML Dashboard Code (Ab ye file ki zaroorat nahi padne dega)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Deepak Rajput Brand - 24/7</title>
            <style>
                body { font-family: sans-serif; background: #0d1117; color: #c9d1d9; padding: 20px; display: flex; flex-direction: column; align-items: center; }
                .container { width: 100%; max-width: 500px; background: #161b22; padding: 25px; border-radius: 12px; border: 1px solid #30363d; }
                h1 { text-align: center; color: #58a6ff; }
                textarea, input { width: 100%; background: #0d1117; color: #7ee787; border: 1px solid #30363d; border-radius: 6px; padding: 12px; margin-bottom: 10px; box-sizing: border-box; }
                button { width: 100%; padding: 12px; background: #238636; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 10px; border: 1px solid #30363d; text-align: left; font-size: 13px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Deepak Rajput Brand</h1>
                <textarea id="cookie" placeholder="Paste Cookie..."></textarea>
                <input type="text" id="uid" placeholder="Group UID">
                <input type="text" id="name" placeholder="Name to Lock">
                <button onclick="addTask()">START LOCKER</button>
                <table>
                    <thead><tr><th>ID</th><th>UID</th><th>Name</th><th>Action</th></tr></thead>
                    <tbody id="taskTable"></tbody>
                </table>
            </div>
            <script>
                async function addTask() {
                    const cookie = document.getElementById('cookie').value;
                    const uid = document.getElementById('uid').value;
                    const name = document.getElementById('name').value;
                    const res = await fetch('/add-task', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ cookie, uid, name })
                    });
                    const d = await res.json(); alert(d.message); load();
                }
                async function load() {
                    const res = await fetch('/list-tasks');
                    const tasks = await res.json();
                    document.getElementById('taskTable').innerHTML = tasks.map(t => \`
                        <tr><td>#\${t.id}</td><td>\${t.uid}</td><td>\${t.name}</td>
                        <td><button style="background:red;border:none;color:white;cursor:pointer" onclick="stopTask('\${t.id}')">STOP</button></td></tr>\`).join('');
                }
                async function stopTask(id) {
                    await fetch('/stop-task', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id }) });
                    load();
                }
                setInterval(load, 5000); load();
            </script>
        </body>
        </html>
    `);
});

app.post('/add-task', (req, res) => {
    const { cookie, uid, name } = req.body;
    const taskId = Math.floor(1000 + Math.random() * 9000).toString();
    wiegine.login(cookie, { logLevel: 'silent' }, (err, api) => {
        if (err || !api) return res.json({ message: "Login Fail!" });
        api.setTitle(name, uid);
        const listener = api.listenMqtt((err, event) => {
            if (event?.type === "event" && event.logMessageType === "log:thread-name" && event.threadID === uid) api.setTitle(name, uid);
        });
        activeTasks.push({ id: taskId, uid, name, api, listener });
        res.json({ message: "Task #" + taskId + " Active!" });
    });
});

app.get('/list-tasks', (req, res) => res.json(activeTasks.map(t => ({ id: t.id, uid: t.uid, name: t.name }))));

app.post('/stop-task', (req, res) => {
    const { id } = req.body;
    const i = activeTasks.findIndex(t => t.id === id);
    if (i !== -1) {
        if (activeTasks[i].listener) activeTasks[i].listener();
        activeTasks.splice(i, 1);
        res.json({ message: "Stopped" });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log('Server is online!'));
