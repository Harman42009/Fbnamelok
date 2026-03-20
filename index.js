const express = require('express');
const wiegine = require('fca-mafiya');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// ================= CONFIG AREA =================
// Ye ab Render ke Environment Variables se sab kuch uthayega
const myConfig = {
    cookie: process.env.FB_COOKIE, 
    uid: process.env.FB_UID,
    lockName: process.env.FB_LOCK_NAME || "DEEPAK RAJPUT BRAND" // Agar Render mein nahi dala toh ye default rahega
};

let activeTasks = [];

function startBot(cookie, uid, name, isAuto = false) {
    if (!cookie || !uid) return console.log("⚠️ Config Missing in Render Settings.");
    
    const taskId = isAuto ? "AUTO-TASK" : Math.floor(1000 + Math.random() * 9000).toString();
    
    wiegine.login(cookie, { logLevel: 'silent' }, (err, api) => {
        if (err || !api) return console.log("❌ Login Fail!");
        
        api.setTitle(name, uid);
        const listener = api.listenMqtt((err, event) => {
            if (event?.type === "event" && event.logMessageType === "log:thread-name" && event.threadID === uid) {
                api.setTitle(name, uid);
            }
        });

        // Task ko list mein add karo taaki stop ho sake
        activeTasks.push({ id: taskId, uid, name, api, listener });
        console.log("✅ Bot Started: " + taskId);
    });
}

// Auto-Start on Restart
if (myConfig.cookie && myConfig.uid) {
    startBot(myConfig.cookie, myConfig.uid, myConfig.lockName, true);
}

// Self-Ping to stay awake
setInterval(() => {
    const url = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}.onrender.com`;
    if(process.env.RENDER_EXTERNAL_HOSTNAME) axios.get(url).catch(()=>{});
}, 2 * 60 * 1000);

// Dashboard UI
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>Deepak Rajput Brand</title>
            <style>
                body { background: #0d1117; color: #c9d1d9; font-family: sans-serif; padding: 20px; text-align: center; }
                .card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 20px; margin-top: 20px; }
                h1 { color: #58a6ff; font-size: 20px; }
                .status { color: #7ee787; font-size: 14px; margin: 10px 0; font-weight: bold; }
                .btn-stop { background: #da3633; color: white; border: none; padding: 12px 25px; border-radius: 8px; font-weight: bold; margin-top: 15px; cursor: pointer; }
            </style>
        </head>
        <body>
            <h1>Deepak Rajput Brand</h1>
            <div id="statusArea"></div>
            <script>
                async function load() {
                    const res = await fetch('/list-tasks');
                    const tasks = await res.json();
                    const area = document.getElementById('statusArea');
                    if(tasks.length === 0) {
                        area.innerHTML = '<p style="color:#8b949e; margin-top:30px;">Bot is Offline.</p>';
                    } else {
                        area.innerHTML = tasks.map(t => \`
                            <div class="card">
                                <div class="status">● \${t.name} is ACTIVE</div>
                                <p style="font-size:12px; color:#8b949e;">UID: \${t.uid}</p>
                                <button class="btn-stop" onclick="stopTask('\${t.id}')">STOP BOT</button>
                            </div>\`).join('');
                    }
                }
                async function stopTask(id) {
                    if(confirm("Bhai, bot ko band kar dein?")) {
                        const res = await fetch('/stop-task', { 
                            method: 'POST', 
                            headers: {'Content-Type': 'application/json'}, 
                            body: JSON.stringify({ id }) 
                        });
                        const result = await res.json();
                        if(result.success) { alert("Bot Stopped!"); load(); }
                    }
                }
                load(); setInterval(load, 5000);
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
        // Mqtt listener ko band karo
        if (activeTasks[index].listener) activeTasks[index].listener();
        // List se hatao
        activeTasks.splice(index, 1);
        console.log("🛑 Bot Stopped via Dashboard");
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log('Server Live'));
