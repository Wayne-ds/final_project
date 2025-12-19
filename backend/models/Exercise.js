const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  targetMuscle: {
    type: String,
    required: true,
    enum: ['胸肌', '背肌', '腿部', '肩膀', '手臂', '核心']
  },
  equipment: {
    type: String,
    required: true,
    enum: ['啞鈴', '槓鈴', '機械', '徒手', '彈力帶', '壺鈴', '其他']
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['初級', '中級', '高級']
  },
  videoUrl: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: ''
  },
  instructions: [{
    type: String
  }],
  tips: [{
    type: String
  }],
  // 🆕 自訂動作標記
  isCustom: {
    type: Boolean,
    default: false
  },
  // 🆕 創建者 ID（未來用戶系統用）
  createdBy: {
    type: String,
    default: 'default-user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新時自動設定 updatedAt
exerciseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 索引優化
exerciseSchema.index({ name: 'text' });
exerciseSchema.index({ targetMuscle: 1, difficulty: 1 });
exerciseSchema.index({ isCustom: 1, createdBy: 1 });

module.exports = mongoose.model('Exercise', exerciseSchema);