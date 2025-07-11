"use client";

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

interface Message {
  username: string;
  content: string;
}

export default function HomePage() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ログイン後のSocket.IO接続処理
  useEffect(() => {
    if (isLoggedIn && !socketRef.current) {
      const socket = io(SERVER_URL, {
        // 認証データは不要 (簡易化のため)
      });

      socket.on('connect', () => {
        console.log('Socket connected!');
        // 過去のメッセージをサーバーから取得
        socket.emit('getInitialMessages');
      });

      socket.on('loadMessages', (initialMessages: Message[]) => {
        setMessages(initialMessages);
        scrollToBottom();
      });

      socket.on('receiveMessage', (message: Message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
        scrollToBottom();
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected!');
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, [isLoggedIn]);

  // スクロール処理
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === '') {
      alert('ユーザー名を入力してください。');
      return;
    }

    // サーバーにユーザー名を送信してログイン
    try {
      const response = await fetch(`${SERVER_URL}/api/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`エラー: ${error.message}`);
        return;
      }

      setCurrentUsername(username);
      setIsLoggedIn(true);
      setMessages([]); // ログイン成功時にメッセージをクリア
    } catch (error) {
      alert('サーバーに接続できませんでした。');
    }
  };

  // メッセージ送信処理
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    if (socketRef.current) {
      const messageData = { username: currentUsername, content: newMessage };
      socketRef.current.emit('sendMessage', messageData);
      setNewMessage('');
    }
  };

  // ログアウト処理
  const handleLogout = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setIsLoggedIn(false);
    setCurrentUsername('');
    setUsername('');
    setMessages([]);
  };

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
            チャットへようこそ
          </h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ユーザー名を入力"
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition-colors"
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">公開チャット</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            ようこそ、**{currentUsername}** さん
          </span>
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.username === currentUsername ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs p-3 rounded-lg shadow-md ${
                msg.username === currentUsername
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 text-gray-800'
              }`}
            >
              <div className="font-bold mb-1">{msg.username}</div>
              <div>{msg.content}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>
      <footer className="bg-white shadow-sm p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition-colors"
          >
            送信
          </button>
        </form>
      </footer>
    </div>
  );
            }
