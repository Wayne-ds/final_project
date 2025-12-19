require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 連接MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB 連接成功'))
  .catch(err => console.error('❌ MongoDB 連接失敗:', err));

// 引入路由
const exercisesRouter = require('./routes/exercises');
const plansRouter = require('./routes/plans');
const logsRouter = require('./routes/logs');

// 使用路由
app.use('/api/exercises', exercisesRouter);
app.use('/api/plans', plansRouter);
app.use('/api/logs', logsRouter);

// 測試路由
app.get('/', (req, res) => {
  res.json({
    message: 'FitMotion API 運行中！',
    version: '1.0.0',
    endpoints: {
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