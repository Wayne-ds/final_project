const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// 註冊
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    
    // 驗證必填欄位
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '請填寫所有必填欄位'
      });
    }
    
    // 檢查用戶名是否已存在
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.username === username 
          ? '用戶名已被使用' 
          : '電子郵件已被註冊'
      });
    }
    
    // 建立新用戶
    const user = new User({
      username,
      email,
      password,
      displayName: displayName || username
    });
    
    await user.save();
    
    // 生成 JWT Token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.status(201).json({
      success: true,
      message: '註冊成功！',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('註冊錯誤:', error);
    res.status(500).json({
      success: false,
      message: '註冊失敗',
      error: error.message
    });
  }
});

// 登入
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '請輸入用戶名和密碼'
      });
    }
    
    // 查找用戶 (支援用戶名或郵件登入)
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用戶名或密碼錯誤'
      });
    }
    
    // 驗證密碼
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用戶名或密碼錯誤'
      });
    }
    
    // 更新最後登入時間
    user.lastLoginAt = Date.now();
    await user.save();
    
    // 生成 JWT Token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      success: true,
      message: '登入成功！',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('登入錯誤:', error);
    res.status(500).json({
      success: false,
      message: '登入失敗',
      error: error.message
    });
  }
});

// 驗證 Token (檢查登入狀態)
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供認證 Token'
      });
    }
    
    // 驗證 Token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 查找用戶
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用戶不存在'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('驗證錯誤:', error);
    res.status(401).json({
      success: false,
      message: 'Token 無效或已過期'
    });
  }
});

// 取得用戶資料
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未登入'
      });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token 無效'
    });
  }
});

// 更新用戶資料
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未登入'
      });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }
    
    const { displayName, avatar, email } = req.body;
    
    if (displayName !== undefined) user.displayName = displayName;
    if (avatar !== undefined) user.avatar = avatar;
    if (email !== undefined) user.email = email;
    
    await user.save();
    
    res.json({
      success: true,
      message: '資料更新成功',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新失敗',
      error: error.message
    });
  }
});

module.exports = router;