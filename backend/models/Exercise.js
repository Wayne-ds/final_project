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
  // 自訂動作標記
  isCustom: {
    type: Boolean,
    default: false
  },
  // 創建者 ID
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

/**
 * 🆕 儲存前自動處理邏輯
 * 修正點：改為 async function 並移除 next()
 */
exerciseSchema.pre('save', async function() {
  // 1. 更新時間戳記
  this.updatedAt = Date.now();

  // 2. 額外防錯：確保自訂動作的名稱不會有前後多餘空格
  if (this.name) {
    this.name = this.name.trim();
  }
  
  // ✅ 在 Async 模式下，執行完畢會自動 next，不需呼叫 next()
});

// 索引優化
exerciseSchema.index({ name: 'text' });
exerciseSchema.index({ targetMuscle: 1, difficulty: 1 });
exerciseSchema.index({ isCustom: 1, createdBy: 1 });

module.exports = mongoose.model('Exercise', exerciseSchema);