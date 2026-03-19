const express = require('express');
const wiegine = require('fca-mafiya');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let config = {
    cookie: "",
    targetUID: "",
    lockedName: "",
    isActive: false
};

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Deepak Rajput Brand - Pro Locker</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; background: #0d1117; color: #c9d1d9; padding: 20px; display: flex; flex-direction: column; align-items: center; }
                .container { width: 100%; max-width: 500px; background: #161b22; padding: 25px; border-radius: 12px; border: 1px solid #30363d; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                h1 { text-align: center; color: #58a6ff; margin-bottom: 20px; font-size: 22px; text-transform: uppercase; }
                label { display: block; margin: 10px 0 5px; color: #8b949e; font-size: 13px; }
                input, textarea { width: 100%; background: #0d1117; color: #7ee787; border: 1px solid #30363d; border-radius: 6px; padding: 10px; box-sizing: border-box; font-family: monospace; }
                .btn { width: 100%; padding: 15px; background: #238636; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-top: 20px; transition: 0.3s; }
                .btn:hover { background: #2ea043; }
                #status { margin-top: 20px; text-align: center; color: #ffa657; font-weight: bold; padding: 10px; border: 1px dashed #30363d; border-radius: 8px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Deepak Rajput Brand</h1>
                <label>Admin Cookie:</label>
                <textarea id="cookie" placeholder="Paste Cookie here..."></textarea>
                
                <label>Group UID:</label>
                <input type="text" id="uid" placeholder="Paste Group UID here...">
                
                <label>Name to Lock:</label>
                <input type="text" id="name" placeholder="Enter Name to Lock...">

                <button class="btn" onclick="start()">ACTIVATE 24/7 PROTECTION</button>
                <div id="status">Bot Status: Offline</div>
            </div>
            <script>
                async function start() {
                    const cookie = document.getElementById('cookie').value.trim();
                    const uid = document.getElementById('uid').value.trim();
                    const name = document.getElementById('name').value.trim();
                    
                    if(!cookie || !uid || !name) return alert("Bhai, Cookie, UID aur Name teeno bharna zaroori hai!");
                    
                    document.getElementById('status').innerText = "Status: Initializing Connection...";
                    const res = await fetch('/activate', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ cookie, uid, name })
                    });
                    const data = await res.json();
                    document.getElementById('status').innerText = "Status: " + data.message;
                }
            </script>
        </body>
        </html>
    `);
});

app.post('/activate', (req, res) => {
    const { cookie, uid, name } = req.body;
    config = { cookie, targetUID: uid, lockedName: name, isActive: true };

    wiegine.login(cookie, { logLevel: 'silent' }, (err, api) => {
        if (err || !api) return res.json({ message: "Login Failed! Cookie invalid hai." });

        // Sabse pehle lock kiya gaya naam set karein
        api.setTitle(config.lockedName, config.targetUID);

        // Monitoring shuru
        api.listenMqtt((err, event) => {
            if (err) return;
            
            // Sirf target group ka naam check karega
            if (event.type === "event" && 
                event.logMessageType === "log:thread-name" && 
                event.threadID === config.targetUID) {
                
                console.log("Change Detected! Reverting to: " + config.lockedName);
                api.setTitle(config.lockedName, config.targetUID);
            }
        });

        res.json({ message: "RUNNING! Name Locked for UID: " + config.targetUID });
    });
});

app.listen(PORT, () => console.log('Deepak Rajput Brand Locker Live!'));
