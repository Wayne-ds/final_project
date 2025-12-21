const mongoose = require('mongoose');

const trainingLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    default: 'default-user'
  },
  exerciseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true
  },
  weight: {
    type: Number,
    required: true,
    min: 0,
    max: 500
  },
  reps: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  sets: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },
  notes: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now
  },
  // 訓練容量 (Volume = weight × reps × sets)
  volume: {
    type: Number,
    default: 0
  },
  // 預估 1RM (使用 Epley 公式)
  estimated1RM: {
    type: Number,
    default: 0
  },
  // 是否為 PR (Personal Record)
  isPR: {
    type: Boolean,
    default: false
  },
  // 編輯歷史追蹤
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * 🆕 儲存前自動計算 (已修正 Async 報錯問題)
 */
trainingLogSchema.pre('save', async function() {
  // 1. 計算訓練容量
  this.volume = this.weight * this.reps * this.sets;
  
  // 2. 計算預估 1RM (Epley 公式: 1RM = weight × (1 + reps / 30))
  if (this.reps === 1) {
    this.estimated1RM = this.weight;
  } else {
    // 保留一位小數
    this.estimated1RM = Math.round(this.weight * (1 + this.reps / 30) * 10) / 10;
  }

  // ✅ 注意：在 async 函式中不需要呼叫 next()
});

/**
 * 🆕 儲存後檢查是否為 PR (個人最高重量紀錄)
 */
trainingLogSchema.post('save', async function(doc) {
  try {
    const TrainingLog = mongoose.model('TrainingLog');
    
    // 查詢該用戶在該動作的歷史最高重量 (排除掉當前這筆)
    const maxWeightLog = await TrainingLog.findOne({
      userId: doc.userId,
      exerciseId: doc.exerciseId,
      _id: { $ne: doc._id }
    }).sort({ weight: -1 });
    
    // 如果是第一次練習，或當前重量大於歷史最高
    if (!maxWeightLog || doc.weight > maxWeightLog.weight) {
      // 更新當前紀錄為 PR
      await TrainingLog.updateOne({ _id: doc._id }, { isPR: true });
      
      // 如果原本有舊的 PR，取消它的標記
      if (maxWeightLog && maxWeightLog.isPR) {
        await TrainingLog.updateOne({ _id: maxWeightLog._id }, { isPR: false });
      }
    }
  } catch (error) {
    console.error('⚠️ PR 判定邏輯發生錯誤:', error);
  }
});

// 索引優化：提升查詢效能
trainingLogSchema.index({ userId: 1, date: -1 });
trainingLogSchema.index({ exerciseId: 1, date: -1 });
trainingLogSchema.index({ userId: 1, exerciseId: 1, weight: -1 });
trainingLogSchema.index({ isPR: 1 });

module.exports = mongoose.model('TrainingLog', trainingLogSchema);