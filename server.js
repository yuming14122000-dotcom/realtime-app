const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let onlineCount = 0;
let wordCounts = {};
let rawResponses = [];
let isLocked = false; 
let isSingleSubmit = true; 
const submittedUsers = new Set(); 

// 🌟 新增：讓伺服器記住目前的題目
let currentTitle = "一起來看看大家的想法"; 

const sensitiveWords = ["靠北", "智障", "白痴", "去死", "幹", "無聊"];

io.on('connection', (socket) => {
  onlineCount++;
  io.emit('update-count', onlineCount);
  io.emit('update-lock-status', isLocked);
  io.emit('update-submit-mode', isSingleSubmit);
  
  // 🌟 當學生或新螢幕連線時，把最新題目傳給他們
  socket.emit('update-title', currentTitle); 
  socket.emit('update-words', wordCounts);

  socket.on('submit-word', (data) => {
    if (isLocked) return;

    let word = data.word.trim();
    let userName = data.name.trim();

    if (word) {
      if (isSingleSubmit && submittedUsers.has(userName)) {
        socket.emit('submit-error', '⚠️ 您已作答過囉！(目前設定一人限答一次)');
        return;
      }

      const isSensitive = sensitiveWords.some(sw => word.includes(sw));
      if (isSensitive) return; 

      submittedUsers.add(userName);
      
      wordCounts[word] = (wordCounts[word] || 0) + 1;
      io.emit('update-words', wordCounts);
      socket.emit('submit-success');
    }
  });

  // 🌟 接收大螢幕改題目的指令，並廣播給全班
  socket.on('change-title', (newTitle) => {
    currentTitle = newTitle;
    io.emit('update-title', currentTitle);
  });

  socket.on('toggle-lock', (status) => {
    isLocked = status;
    io.emit('update-lock-status', isLocked);
  });

  socket.on('toggle-submit-mode', (status) => {
    isSingleSubmit = status;
    io.emit('update-submit-mode', isSingleSubmit);
  });

  socket.on('delete-word', (wordToDelete) => {
    if (wordCounts[wordToDelete]) {
      delete wordCounts[wordToDelete];
      io.emit('update-words', wordCounts);
    }
  });

  socket.on('disconnect', () => {
    onlineCount--;
    io.emit('update-count', onlineCount);
  });

  socket.on('clear-words', () => {
    wordCounts = {};
    rawResponses = [];
    submittedUsers.clear(); 
    io.emit('update-words', wordCounts);
    io.emit('words-cleared'); 
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`系統啟動成功！`);
});
