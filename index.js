const express = require('express');
const wiegine = require('fca-mafiya');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// Memory storage for tasks and logs
let activeTasks = new Map();
let logs = [];

// Helper to add logs
function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    logs.unshift(`[${time}] \${msg}`);
    if (logs.length > 10) logs.pop(); // Sirf latest 10 logs rakhega
}

app.get('/', (req, res) => {
    let taskRows = "";
    activeTasks.forEach((val, key) => {
        taskRows += `
            <div style="background:#1c2128; border:1px solid #30363d; padding:10px; margin-top:8px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <div style="text-align:left;">
                    <b style="color:#58a6ff;">ID: \${key}</b><br>
                    <small style="color:#8b949e;">Group: \${val.uid} | Name: \${val.name}</small>
                </div>
                <button onclick="stopTask('\${key}')" style="background:#da3633; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-weight:bold;">STOP</button>
            </div>`;
    });

    let logHtml = logs.map(l => `<div style="border-bottom:1px solid #30363d; padding:5px;">\${l}</div>`).join('');

    res.send(`
        <body style="background:#0d1117; color:#c9d1d9; font-family:sans-serif; text-align:center; padding:20px;">
            <h1 style="color:#58a6ff; text-shadow: 0 0 10px rgba(88,166,255,0.3);">Deepak Rajput Brand Control Center ✅</h1>
            
            <div style="background:#161b22; padding:20px; border-radius:12px; border:1px solid #30363d; display:inline-block; width:95%; max-width:450px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                <input id="u" placeholder="Group UID" style="width:90%; margin:8px; padding:12px; background:#0d1117; border:1px solid #30363d; color:#7ee787; border-radius:6px;">
                <input id="n" placeholder="Lock Name" style="width:90%; margin:8px; padding:12px; background:#0d1117; border:1px solid #30363d; color:#7ee787; border-radius:6px;">
                <textarea id="c" placeholder="Paste AppState Cookie JSON" style="width:90%; margin:8px; padding:12px; background:#0d1117; border:1px solid #30363d; color:#7ee787; border-radius:6px; height:80px;"></textarea>
                <button onclick="start()" style="width:95%; background:#238636; color:white; padding:14px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:16px; margin-top:10px;">START NEW PROTECTION</button>
            </div>

            <div style="margin-top:25px; max-width:500px; margin-left:auto; margin-right:auto;">
                <h3 style="color:#f0883e; text-align:left;">📜 System Logs</h3>
                <div style="background:#000; color:#0f0; font-family:monospace; padding:15px; border-radius:8px; text-align:left; font-size:13px; border:1px solid #30363d; height:150px; overflow-y:auto;">
                    \${logHtml || "No activity recorded..."}
                </div>
            </div>

            <div style="margin-top:25px; max-width:500px; margin-left:auto; margin-right:auto;">
                <h3 style="color:#58a6ff; text-align:left;">🛡️ Active Protections</h3>
                <div id="taskList">\${taskRows || "<p style='color:#8b949e;'>Waiting for new tasks...</p>"}</div>
            </div>

            <script>
                async function start(){
                    const u = document.getElementById('u').value;
                    const n = document.getElementById('n').value;
                    const c = document.getElementById('c').value;
                    if(!u || !n || !c) return alert("Bhai, saare boxes bharo!");

                    const res = await fetch('/add', {
                        method:'POST',
                        headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({uid:u, name:n, cookie:c})
                    });
                    const data = await res.json();
                    alert(data.msg);
                    location.reload();
                }

                async function stopTask(id){
                    if(!confirm("Kya aap Task #"+id+" ko band karna chahte hain?")) return;
                    await fetch('/stop', {
                        method:'POST',
                        headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({id:id})
                    });
                    location.reload();
                }
            </script>
        </body>
    `);
});

app.post('/add', (req, res) => {
    const { uid, name, cookie } = req.body;
    const taskId = Math.floor(1000 + Math.random() * 9000).toString();
    
    try {
        const appState = JSON.parse(cookie);
        wiegine({ appState }, { logLevel: 'silent', forceLogin: true }, (err, api) => {
            if(err) {
                addLog(`❌ Task #\${taskId} Login Failed!`);
                return;
            }
            
            api.setTitle(name, uid);
            const stop = api.listenMqtt((err, event) => {
                if(event?.logMessageType === "log:thread-name" && event.threadID === uid){
                    addLog(`🔄 Task #\${taskId}: Resetting name to "\${name}"`);
                    setTimeout(() => api.setTitle(name, uid), 2000);
                }
            });

            activeTasks.set(taskId, { uid, name, api, stop });
            addLog(`✅ Task #\${taskId} Started (UID: \${uid})`);
        });
        res.json({ msg: "Task #"+taskId+" Initialized!", taskId });
    } catch(e) {
        res.json({ msg: "Error: Invalid Cookie JSON!" });
    }
});

app.post('/stop', (req, res) => {
    const { id } = req.body;
    if (activeTasks.has(id)) {
        const task = activeTasks.get(id);
        if (typeof task.stop === 'function') task.stop(); // Stop listener
        activeTasks.delete(id);
        addLog(`🛑 Task #\${id} Stopped by User`);
        res.json({ msg: "Stopped" });
    } else {
        res.json({ msg: "Not found" });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log("Deepak Brand Manager Live!"));
