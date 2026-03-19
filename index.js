const express = require('express');
const wiegine = require('fca-mafiya');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let activeTasks = [];

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Deepak Rajput Brand - Multi Tasker</title>
            <style>
                body { font-family: sans-serif; background: #0d1117; color: #c9d1d9; padding: 20px; display: flex; flex-direction: column; align-items: center; }
                .container { width: 100%; max-width: 600px; background: #161b22; padding: 25px; border-radius: 12px; border: 1px solid #30363d; }
                h1 { text-align: center; color: #58a6ff; }
                input, textarea { width: 100%; background: #0d1117; color: #7ee787; border: 1px solid #30363d; border-radius: 6px; padding: 10px; margin-bottom: 10px; box-sizing: border-box; }
                button { width: 100%; padding: 12px; background: #238636; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 10px; border: 1px solid #30363d; text-align: left; font-size: 13px; }
                .btn-stop { background: #da3633; padding: 5px 10px; border-radius: 4px; font-size: 11px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Deepak Rajput Brand</h1>
                <textarea id="cookie" placeholder="Paste Cookie..."></textarea>
                <input type="text" id="uid" placeholder="Group UID...">
                <input type="text" id="name" placeholder="Name to Lock...">
                <button onclick="addTask()">START LOCK</button>
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
                    const res = await fetch('/add', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ cookie, uid, name })
                    });
                    const data = await res.json();
                    alert(data.message);
                    load();
                }
                async function load() {
                    const res = await fetch('/list');
                    const tasks = await res.json();
                    const table = document.getElementById('taskTable');
                    table.innerHTML = tasks.map(t => \`
                        <tr>
                            <td>#\${t.id}</td>
                            <td>\${t.uid}</td>
                            <td>\${t.name}</td>
                            <td><button class="btn-stop" onclick="stop('\${t.id}')">STOP</button></td>
                        </tr>\`).join('');
                }
                async function stop(id) {
                    await fetch('/stop', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ id })
                    });
                    load();
                }
                setInterval(load, 5000); load();
            </script>
        </body>
        </html>
    `);
});

app.post('/add', (req, res) => {
    const { cookie, uid, name } = req.body;
    const taskId = Math.floor(1000 + Math.random() * 9000).toString();
    wiegine.login(cookie, { logLevel: 'silent' }, (err, api) => {
        if (err || !api) return res.json({ message: "Login Fail!" });
        api.setTitle(name, uid);
        const stopListen = api.listenMqtt((err, event) => {
            if (event?.type === "event" && event.logMessageType === "log:thread-name" && event.threadID === uid) {
                api.setTitle(name, uid);
            }
        });
        activeTasks.push({ id: taskId, uid, name, api, stopListen });
        res.json({ message: "Task #" + taskId + " Started!" });
    });
});

app.get('/list', (req, res) => {
    res.json(activeTasks.map(t => ({ id: t.id, uid: t.uid, name: t.name })));
});

app.post('/stop', (req, res) => {
    const { id } = req.body;
    const idx = activeTasks.findIndex(t => t.id === id);
    if (idx !== -1) {
        if (activeTasks[idx].stopListen) activeTasks[idx].stopListen();
        activeTasks.splice(idx, 1);
        res.json({ message: "Stopped" });
    }
});

app.listen(PORT, () => console.log('Bot is running on port ' + PORT));
