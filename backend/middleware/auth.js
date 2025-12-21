const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * 認證中介層
 * 驗證請求中的 JWT Token
 */
const authMiddleware = (req, res, next) => {
  try {
    // 從 Header 取得 Token
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: '未提供認證 Token'
      });
    }
    
    // 檢查格式是否為 "Bearer <token>"
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Token 格式錯誤'
      });
    }
    
    const token = parts[1];
    
    // 驗證 Token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 將用戶資訊附加到 request 物件
    req.userId = decoded.userId;
    req.username = decoded.username;
    
    next();
  } catch (error) {
    console.error('認證錯誤:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token 已過期'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token 無效'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: '認證失敗'
    });
  }
};

/**
 * 選擇性認證中介層
 * 如果有 Token 則驗證，沒有則繼續
 */
const optionalAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // 沒有 Token，使用預設用戶
      req.userId = 'default-user';
      return next();
    }
    
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      req.userId = 'default-user';
      return next();
    }
    
    const token = parts[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.userId = decoded.userId;
    req.username = decoded.username;
    
    next();
  } catch (error) {
    // Token 驗證失敗，使用預設用戶
    req.userId = 'default-user';
    next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware
};