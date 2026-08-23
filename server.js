const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let onlineCount = 0;
let wordCounts = {};
// 新增：用來記錄每個人送出的詳細資料
let rawResponses = []; 

io.on('connection', (socket) => {
  onlineCount++;
  io.emit('update-count', onlineCount);

  // 當老師打開後台時，立刻傳送目前的紀錄給他看
  socket.emit('update-dashboard', rawResponses);

  socket.on('submit-word', (data) => {
    const word = data.word.trim();
    if (word) {
      // 1. 更新文字雲統計
      wordCounts[word] = (wordCounts[word] || 0) + 1;
      io.emit('update-words', wordCounts);

      // 2. 記錄詳細資料給老師後台
      const timeString = new Date().toLocaleTimeString('zh-TW', { hour12: false });
      rawResponses.push({ name: data.name, word: word, time: timeString });
      // 廣播最新列表
      io.emit('update-dashboard', rawResponses);
    }
  });

  socket.on('disconnect', () => {
    onlineCount--;
    io.emit('update-count', onlineCount);
  });
  
  socket.on('clear-words', () => {
    wordCounts = {};
    rawResponses = []; // 清空大螢幕時，後台紀錄也一起清空
    io.emit('update-words', wordCounts);
    io.emit('update-dashboard', rawResponses);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`系統啟動成功！`);
});
