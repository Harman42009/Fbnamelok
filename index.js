const express = require('express');
const wiegine = require('fca-mafiya');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

let activeTasks = new Map();
let logs = [];

function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    logs.unshift(`[${time}] ${msg}`);
    if (logs.length > 10) logs.pop();
}

// --- DASHBOARD UI ---
app.get('/', (req, res) => {
    let taskRows = "";
    activeTasks.forEach((val, key) => {
        taskRows += `
            <div style="background:#1c2128; border:1px solid #30363d; padding:10px; margin-top:8px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <div style="text-align:left;">
                    <b style="color:#58a6ff;">ID: ${key}</b><br>
                    <small style="color:#8b949e;">Group: ${val.uid} | Name: ${val.name}</small>
                </div>
                <button onclick="stopTask('${key}')" style="background:#da3633; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer;">STOP</button>
            </div>`;
    });

    let logHtml = logs.map(l => `<div style="border-bottom:1px solid #30363d; padding:5px;">${l}</div>`).join('');

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Deepak Rajput Brand Control</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { background: #0d1117; color: #c9d1d9; font-family: sans-serif; text-align: center; padding: 20px; }
                .box { background: #161b22; padding: 20px; border-radius: 12px; border: 1px solid #30363d; display: inline-block; width: 95%; max-width: 450px; }
                input, textarea { width: 90%; margin: 8px; padding: 12px; background: #0d1117; border: 1px solid #30363d; color: #7ee787; border-radius: 6px; }
                button { width: 95%; background: #238636; color: white; padding: 14px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
                .terminal { background: #000; color: #0f0; font-family: monospace; padding: 15px; border-radius: 8px; text-align: left; font-size: 13px; border: 1px solid #30363d; height: 120px; overflow-y: auto; margin: 20px auto; max-width: 500px; }
            </style>
        </head>
        <body>
            <h1 style="color:#58a6ff;">Deepak Rajput Brand Ultra ✅</h1>
            <div class="box">
                <input id="u" placeholder="Group UID">
                <input id="n" placeholder="Lock Name">
                <textarea id="c" placeholder="Paste Cookie (JSON or String)"></textarea>
                <button onclick="start()">START PROTECTION</button>
            </div>
            <div class="terminal">${logHtml || "System Ready..."}</div>
            <div style="max-width:500px; margin:auto;">
                <h3 style="text-align:left;">🛡️ Active Protections</h3>
                <div id="taskList">${taskRows || "<p style='color:#8b949e;'>No active tasks</p>"}</div>
            </div>
            <script>
                async function start(){
                    const res = await fetch('/add', {
                        method:'POST',
                        headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({uid:document.getElementById('u').value, name:document.getElementById('n').value, cookie:document.getElementById('c').value})
                    });
                    const data = await res.json();
                    alert(data.msg);
                    location.reload();
                }
                async function stopTask(id){
                    await fetch('/stop', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id:id}) });
                    location.reload();
                }
            </script>
        </body>
        </html>
    `);
});

// --- API LOGIC ---
app.post('/add', (req, res) => {
    let { uid, name, cookie } = req.body;
    const taskId = Math.floor(1000 + Math.random() * 9000).toString();
    
    let appState;
    try {
        // Check if it's JSON or String
        if (cookie.includes('[') && cookie.includes(']')) {
            appState = JSON.parse(cookie);
        } else {
            // Convert String to JSON format for fca-mafiya
            appState = cookie.split(';').map(c => {
                const [key, value] = c.split('=');
                return { key: key?.trim(), value: value?.trim(), domain: "facebook.com", path: "/" };
            }).filter(item => item.key && item.value);
        }

        wiegine({ appState }, { logLevel: 'silent', forceLogin: true }, (err, api) => {
            if(err) {
                addLog(`❌ Task #${taskId} Login Failed! Check Cookie.`);
                return;
            }
            api.setTitle(name, uid);
            const stop = api.listenMqtt((err, event) => {
                if(event?.logMessageType === "log:thread-name" && event.threadID === uid){
                    addLog(`🔄 Task #${taskId}: Name Reverted`);
                    setTimeout(() => api.setTitle(name, uid), 2000);
                }
            });
            activeTasks.set(taskId, { uid, name, stop });
            addLog(`✅ Task #${taskId} Started!`);
        });
        res.json({ msg: "Task #"+taskId+" Started!", taskId });
    } catch(e) {
        res.json({ msg: "Error: Cookie Format is wrong!" });
    }
});

app.post('/stop', (req, res) => {
    const { id } = req.body;
    if (activeTasks.has(id)) {
        const task = activeTasks.get(id);
        if (typeof task.stop === 'function') task.stop();
        activeTasks.delete(id);
        addLog(`🛑 Task #${id} Stopped`);
    }
    res.json({ msg: "OK" });
});

app.listen(PORT, '0.0.0.0', () => console.log("Deepak Brand Ready!"));
