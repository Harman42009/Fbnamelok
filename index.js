const express = require('express');
const wiegine = require('fca-mafiya');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Sabhi active tasks ko alag-alag store karne ke liye list
let activeTasks = [];

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Deepak Rajput Brand - Multi-Tasker</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; background: #0d1117; color: #c9d1d9; padding: 20px; display: flex; flex-direction: column; align-items: center; }
                .container { width: 100%; max-width: 800px; background: #161b22; padding: 25px; border-radius: 12px; border: 1px solid #30363d; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                h1 { text-align: center; color: #58a6ff; text-transform: uppercase; letter-spacing: 2px; }
                .input-section { background: #0d1117; padding: 20px; border-radius: 10px; border: 1px solid #30363d; margin-bottom: 30px; }
                textarea, input { width: 100%; background: #161b22; color: #7ee787; border: 1px solid #30363d; border-radius: 6px; padding: 12px; margin-bottom: 10px; box-sizing: border-box; font-family: monospace; }
                .btn-add { width: 100%; padding: 15px; background: #238636; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { padding: 15px; border: 1px solid #30363d; text-align: left; }
                th { background: #21262d; color: #58a6ff; font-size: 14px; }
                .btn-stop { background: #da3633; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; }
                .status-active { color: #3fb950; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Deepak Rajput Brand</h1>
                <p style="text-align:center; color:#8b949e;">Multi-ID & Multi-Group Name Locker</p>
                
                <div class="input-section">
                    <textarea id="cookie" placeholder="Paste Admin Cookie here..."></textarea>
                    <input type="text" id="uid" placeholder="Group UID (e.g. 123456789)">
                    <input type="text" id="name" placeholder="Name to Lock (e.g. Deepak Brand ✅)">
                    <button class="btn-add" onclick="startNewTask()">START PROTECTION TASK</button>
                </div>

                <h3>Live Active Tasks</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Task ID</th>
                            <th>Group UID</th>
                            <th>Locked Name</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="taskTable"></tbody>
                </table>
            </div>

            <script>
                async function startNewTask() {
                    const cookie = document.getElementById('cookie').value.trim();
                    const uid = document.getElementById('uid').value.trim();
                    const name = document.getElementById('name').value.trim();
                    if(!cookie || !uid || !name) return alert("Bhai, sabhi box bharna zaroori hai!");

                    const res = await fetch('/add-task', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ cookie, uid, name })
                    });
                    const data = await res.json();
                    alert(data.message);
                    updateTable();
                }

                async function updateTable() {
                    const res = await fetch('/list-tasks');
                    const tasks = await res.json();
                    const table = document.getElementById('taskTable');
                    table.innerHTML = '';
                    tasks.forEach(t => {
                        table.innerHTML += \`
                            <tr>
                                <td style="color:#ffa657; font-family:monospace;">#\${t.id}</td>
                                <td>\${t.uid}</td>
                                <td>\${t.name}</td>
                                <td class="status-active">RUNNING</td>
                                <td><button class="btn-stop" onclick="stopTask('\${t.id}')">STOP</button></td>
                            </tr>\`;
                    });
                }

                async function stopTask(id) {
                    await fetch('/stop-task', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ id })
                    });
                    updateTable();
                }

                setInterval(updateTable, 5000);
                updateTable();
            </script>
        </body>
        </html>
    \`);
});

app.post('/add-task', (req, res) => {
    const { cookie, uid, name } = req.body;
    const taskId = Math.floor(1000 + Math.random() * 9000).toString();

    wiegine.login(cookie, { logLevel: 'silent' }, (err, api) => {
        if (err || !api) return res.json({ message: "Login Fail! Cookie expired hai." });

        // Naya task object
        const newTask = {
            id: taskId,
            uid: uid,
            name: name,
            api: api,
            listener: null
        };

        // Name turant set karna
        api.setTitle(name, uid);

        // Sirf is group ke liye monitoring shuru karna
        newTask.listener = api.listenMqtt((err, event) => {
            if (event?.type === "event" && event.logMessageType === "log:thread-name" && event.threadID === uid) {
                console.log(\`Task #\${taskId}: Reverting name in \${uid}\`);
                api.setTitle(name, uid);
            }
        });

        activeTasks.push(newTask);
        res.json({ message: "Task #" + taskId + " Successfully Started!" });
    });
});

app.get('/list-tasks', (req, res) => {
    res.json(activeTasks.map(t => ({ id: t.id, uid: t.uid, name: t.name })));
});

app.post('/stop-task', (req, res) => {
    const { id } = req.body;
    const index = activeTasks.findIndex(t => t.id === id);
    if (index !== -1) {
        if (activeTasks[index].listener) activeTasks[index].listener(); // MQTT stop
        activeTasks.splice(index, 1); // List se delete
        res.json({ message: "Task Stopped." });
    }
});

app.listen(PORT, () => console.log('Deepak Rajput Brand Multi-Tasker Live!'));
