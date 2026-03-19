const fs = require('fs');
const path = require('path');
const express = require('express');
const wiegine = require('fca-mafiya');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
// Render ke liye 0.0.0.0 aur Port 10000 zaroori hai
const PORT = process.env.PORT || 10000;

const tasks = new Map();
let startTime = Date.now();
const monitorData = { activeTasks: 0, totalSent: 0 };

/* --- CLASSES --- */
class TaskConfig {
  constructor(delay, cookies) {
    this.delay = parseInt(delay) || 10;
    this.running = true;
    this.cookies = cookies;
  }
}

class TaskMessageData {
  constructor(threadID, messages, hatersName, lastName) {
    this.threadID = threadID;
    this.messages = messages;
    this.hatersName = hatersName;
    this.lastName = lastName;
    this.currentIndex = 0;
    this.loopCount = 0;
  }
}

class RawSessionManager {
  constructor(ws, taskId, totalSessions) {
    this.ws = ws;
    this.taskId = taskId;
    this.totalSessions = totalSessions;
    this.sessions = new Map();
    this.unhealthyCount = 0;
    this.unhealthyThreshold = Math.max(1, Math.floor(totalSessions * 0.75));
  }

  log(msg) {
    const text = `[Task ${this.taskId}] ${msg}`;
    console.log(text);
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'log', message: text }));
    }
  }

  async createRawSession(cookie, index, threadID) {
    return new Promise((resolve) => {
      wiegine.login(cookie, { logLevel: 'silent', forceLogin: true }, (err, api) => {
        if (err || !api) {
          this.unhealthyCount++;
          resolve(null);
        } else {
          this.sessions.set(index, { api, healthy: true });
          resolve(api);
        }
      });
    });
  }
}

/* --- LOGIC --- */
async function runTaskLoop(taskId) {
  const task = tasks.get(taskId);
  if (!task || !task.config.running) return;
  
  const msg = `${task.messageData.messages[task.messageData.currentIndex]} - ${taskId.slice(0,4)}`;
  
  // Pehli healthy session se message bhejna
  const session = Array.from(task.rawManager.sessions.values()).find(s => s.healthy);
  if (session) {
    session.api.sendMessage(msg, task.messageData.threadID, (err) => {
      if (!err) {
        monitorData.totalSent++;
        task.messageData.currentIndex = (task.messageData.currentIndex + 1) % task.messageData.messages.length;
      }
    });
  }
}

/* --- SERVER & ROUTES --- */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Render ko "Alive" rakhne ke liye host 0.0.0.0 zaroori hai
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 Server is live on port ${PORT}`);
});

/* --- WEBSOCKET --- */
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.on('message', async (msg) => {
    let data = JSON.parse(msg);
    if (data.type === 'start') {
      const taskId = uuidv4();
      const cookies = data.cookieContent.split('\n').filter(Boolean);
      const messages = data.messageContent.split('\n').filter(Boolean);
      
      const task = {
        config: new TaskConfig(data.delay, cookies),
        messageData: new TaskMessageData(data.threadID, messages, [], []),
        rawManager: new RawSessionManager(ws, taskId, cookies.length),
        intervalId: null
      };

      for(let i=0; i<cookies.length; i++) {
        await task.rawManager.createRawSession(cookies[i], i, data.threadID);
      }

      task.intervalId = setInterval(() => runTaskLoop(taskId), task.config.delay * 1000);
      tasks.set(taskId, task);
      ws.send(JSON.stringify({ type: 'task_started', taskId }));
    }
    
    if (data.type === 'monitor') {
      ws.send(JSON.stringify({
        type: 'monitor_data',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        activeTasks: tasks.size,
        totalSent: monitorData.totalSent
      }));
    }
  });
});
