const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, '請輸入有效的電子郵件']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  displayName: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: 'https://via.placeholder.com/150?text=User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * 密碼加密邏輯 (Async 版本)
 */
userSchema.pre('save', async function() {
  // 優化 1：確保在加密前處理 displayName，避免邏輯分散
  if (!this.displayName) {
    this.displayName = this.username;
  }

  // 只有在密碼被修改時才處理加密
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      throw error; 
    }
  }
});

// 驗證密碼方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // 增加防錯：確保有傳入密碼且資料庫內有雜湊值
    if (!candidatePassword || !this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// 取得公開資料
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    displayName: this.displayName,
    avatar: this.avatar,
    createdAt: this.createdAt,
    lastLoginAt: this.lastLoginAt
  };
};

// 建立索引
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);