const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// 設定靜態檔案路徑
app.use(express.static('public'));

let onlineCount = 0;
// 用來記錄每個詞彙的出現次數
let wordCounts = {};

io.on('connection', (socket) => {
  // 1. 每當有人連線，在線人數 +1 並廣播
  onlineCount++;
  io.emit('update-count', onlineCount);

  // 2. 接收學員送出的詞彙
  socket.on('submit-word', (data) => {
    const word = data.word.trim();
    if (word) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
      // 廣播最新統計給所有畫面（包含大螢幕）
      io.emit('update-words', wordCounts);
    }
  });

  // 3. 處理離線，在線人數 -1
  socket.on('disconnect', () => {
    onlineCount--;
    io.emit('update-count', onlineCount);
  });
  
  // 4. 清空文字雲功能
  socket.on('clear-words', () => {
    wordCounts = {};
    io.emit('update-words', wordCounts);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`系統啟動成功！請在瀏覽器打開 http://localhost:${PORT}`);
});