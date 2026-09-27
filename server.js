const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let onlineCount = 0;
let wordCounts = {};
let rawResponses = [];
let isLocked = false; 
let isSingleSubmit = true; // 預設一人一答
const submittedUsers = new Set(); // 紀錄已作答的學生名單

const sensitiveWords = ["靠北", "智障", "白痴", "去死", "幹", "無聊"];

io.on('connection', (socket) => {
  onlineCount++;
  io.emit('update-count', onlineCount);
  io.emit('update-lock-status', isLocked);
  io.emit('update-submit-mode', isSingleSubmit); // 同步目前的作答模式
  socket.emit('update-words', wordCounts);

  // 接收學生送出的詞
  socket.on('submit-word', (data) => {
    if (isLocked) return;

    let word = data.word.trim();
    let userName = data.name.trim();

    if (word) {
      // 🛑 檢查是否為「一人一答」模式，且該用戶已作答過
      if (isSingleSubmit && submittedUsers.has(userName)) {
        socket.emit('submit-error', '⚠️ 您已作答過囉！(目前設定一人限答一次)');
        return;
      }

      const isSensitive = sensitiveWords.some(sw => word.includes(sw));
      if (isSensitive) return; 

      // ✅ 標記該用戶已成功作答
      submittedUsers.add(userName);
      
      wordCounts[word] = (wordCounts[word] || 0) + 1;
      io.emit('update-words', wordCounts);

      // 回傳成功訊息給該位學生，讓他手機畫面更新
      socket.emit('submit-success');
    }
  });

  socket.on('toggle-lock', (status) => {
    isLocked = status;
    io.emit('update-lock-status', isLocked);
  });

  // 🔄 切換「一人一答」與「開放多次」
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
    submittedUsers.clear(); // 🗑️ 清空作答紀錄，讓大家可以重新回答下一題
    io.emit('update-words', wordCounts);
    io.emit('words-cleared'); // 通知所有學生的手機解除鎖定狀態
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`系統啟動成功！`);
});
