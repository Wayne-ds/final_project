require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://lustrous-stardust-b84b1b.netlify.app' 
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // 開發階段先允許所有
    }
  },
  credentials: true
}));

app.use(express.json());

// 連接MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB 連接成功'))
  .catch(err => console.error('❌ MongoDB 連接失敗:', err));

// 引入路由
const exercisesRouter = require('./routes/exercises');
const plansRouter = require('./routes/plans');
const logsRouter = require('./routes/logs');
const authRouter = require('./routes/auth'); // 🆕 新增

// 使用路由
app.use('/api/exercises', exercisesRouter);
app.use('/api/plans', plansRouter);
app.use('/api/logs', logsRouter);
app.use('/api/auth', authRouter); // 🆕 新增

// 測試路由
app.get('/', (req, res) => {
  res.json({
    message: 'FitMotion API 運行中！',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth (register, login, verify, profile)',
      exercises: '/api/exercises',
      plans: '/api/plans',
      logs: '/api/logs'
    }
  });
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 伺服器運行於 http://localhost:${PORT}`);
});