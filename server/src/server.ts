import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

// ミドルウェア
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// メモリ上でユーザーとメッセージを管理
const users = new Map<string, string>(); // { username: userId }
const messages: { username: string; content: string; }[] = [];

// API ルート: ユーザー登録とログイン (メモリ上での簡易認証)
app.post('/api/auth', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  // ユーザーが既に存在するかチェック
  if (users.has(username)) {
    return res.status(409).json({ message: 'Username already taken' });
  }

  // ユーザーを追加
  const userId = username; // 簡略化のため、ユーザー名をIDとして使用
  users.set(username, userId);

  res.json({ message: 'Login successful', username: username });
});

// Socket.IO 接続イベント
io.on('connection', (socket) => {
  console.log('A user connected');

  // 接続時に過去のメッセージを送信
  socket.emit('loadMessages', messages);

  // 新しいメッセージの受信
  socket.on('sendMessage', (data: { username: string; content: string; }) => {
    if (!data.username || !data.content || data.content.trim() === '') {
      socket.emit('error', 'Invalid message');
      return;
    }
    
    // 新しいメッセージを配列に追加
    messages.push(data);
    
    // 全てのクライアントに新しいメッセージをブロードキャスト
    io.emit('receiveMessage', data);
    console.log(`Message from ${data.username}: ${data.content}`);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// ヘルスチェックエンドポイント (Renderデプロイ時に便利)
app.get('/', (req, res) => {
  res.send('Super Simple Chat App Server is running!');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
