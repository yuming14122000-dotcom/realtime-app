const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let onlineCount = 0;
let wordCounts = {};
let rawResponses = [];
let isLocked = false; // 新增：鎖定狀態

// 🛑 新增：敏感詞過濾庫 (你可以隨時在這裡新增詞彙)
const sensitiveWords = ["靠北", "智障", "白痴", "去死", "幹", "無聊"];

io.on('connection', (socket) => {
  onlineCount++;
  io.emit('update-count', onlineCount);
  io.emit('update-lock-status', isLocked); // 新連線者同步鎖定狀態
  socket.emit('update-dashboard', rawResponses);
  socket.emit('update-words', wordCounts);

  // 接收學生送出的詞
  socket.on('submit-word', (data) => {
    if (isLocked) return; // 如果房間已鎖定，則拒絕接收新訊息

    let word = data.word.trim();
    if (word) {
      // 檢查是否包含敏感詞，若有則直接丟棄不顯示
      const isSensitive = sensitiveWords.some(sw => word.includes(sw));
      if (isSensitive) return; 

      wordCounts[word] = (wordCounts[word] || 0) + 1;
      io.emit('update-words', wordCounts);

      const timeString = new Date().toLocaleTimeString('zh-TW', { hour12: false });
      rawResponses.push({ name: data.name, word: word, time: timeString });
      io.emit('update-dashboard', rawResponses);
    }
  });

  // 🔒 新增：切換鎖定狀態
  socket.on('toggle-lock', (status) => {
    isLocked = status;
    io.emit('update-lock-status', isLocked);
  });

  // 🗑️ 新增：大螢幕點擊刪除特定詞彙
  socket.on('delete-word', (wordToDelete) => {
    if (wordCounts[wordToDelete]) {
      delete wordCounts[wordToDelete]; // 從畫布清單移除
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
    io.emit('update-words', wordCounts);
    io.emit('update-dashboard', rawResponses);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`系統啟動成功！`);
});
