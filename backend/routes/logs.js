const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const TrainingLog = require('../models/TrainingLog');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

// 新增訓練記錄（需要認證）
router.post('/', authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const userId = req.userId; // 從 middleware 取得
    const { exerciseId, weight, reps, sets, notes, date } = req.body;
    
    // 驗證必填欄位
    if (!exerciseId || weight === undefined || !reps || !sets) {
      return res.status(400).json({
        success: false,
        message: '請填寫所有必填欄位'
      });
    }
    
    // 驗證數值範圍
    if (weight < 0 || weight > 500) {
      return res.status(400).json({
        success: false,
        message: '重量必須在 0-500kg 之間'
      });
    }
    
    if (reps < 1 || reps > 100) {
      return res.status(400).json({
        success: false,
        message: '次數必須在 1-100 之間'
      });
    }
    
    if (sets < 1 || sets > 20) {
      return res.status(400).json({
        success: false,
        message: '組數必須在 1-20 之間'
      });
    }
    
    // 建立訓練記錄
    const log = new TrainingLog({
      userId,
      exerciseId,
      weight: parseFloat(weight),
      reps: parseInt(reps),
      sets: parseInt(sets),
      notes: notes || '',
      date: date || Date.now()
    });
    
    await log.save({ session });
    
    // 檢查並更新 PR
    const previousPR = await TrainingLog.findOne({
      userId,
      exerciseId,
      isPR: true,
      _id: { $ne: log._id }
    }).session(session);
    
    if (!previousPR || log.weight > previousPR.weight) {
      log.isPR = true;
      await log.save({ session });
      
      // 取消之前的 PR 標記
      if (previousPR) {
        previousPR.isPR = false;
        await previousPR.save({ session });
      }
    }
    
    await session.commitTransaction();
    
    // Populate exercise 資訊
    await log.populate('exerciseId');
    
    res.status(201).json({
      success: true,
      message: log.isPR ? '🎉 恭喜！這是新的 PR 記錄！' : '記錄成功',
      log
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('新增記錄錯誤:', error);
    res.status(400).json({
      success: false,
      message: '記錄失敗',
      error: error.message
    });
  } finally {
    session.endSession();
  }
});

// 更新訓練記錄（需要認證）
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { weight, reps, sets, notes } = req.body;
    
    const log = await TrainingLog.findById(req.params.id);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: '找不到該記錄'
      });
    }
    
    // 檢查權限
    if (log.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: '無權限編輯此記錄'
      });
    }
    
    // 更新欄位
    if (weight !== undefined) {
      if (weight < 0 || weight > 500) {
        return res.status(400).json({
          success: false,
          message: '重量必須在 0-500kg 之間'
        });
      }
      log.weight = parseFloat(weight);
    }
    
    if (reps !== undefined) {
      if (reps < 1 || reps > 100) {
        return res.status(400).json({
          success: false,
          message: '次數必須在 1-100 之間'
        });
      }
      log.reps = parseInt(reps);
    }
    
    if (sets !== undefined) {
      if (sets < 1 || sets > 20) {
        return res.status(400).json({
          success: false,
          message: '組數必須在 1-20 之間'
        });
      }
      log.sets = parseInt(sets);
    }
    
    if (notes !== undefined) log.notes = notes;
    
    // 標記為已編輯
    log.isEdited = true;
    log.editedAt = Date.now();
    
    await log.save();
    await log.populate('exerciseId');
    
    res.json({
      success: true,
      message: '記錄更新成功',
      log
    });
  } catch (error) {
    console.error('更新記錄錯誤:', error);
    res.status(400).json({
      success: false,
      message: '更新失敗',
      error: error.message
    });
  }
});

// 獲取所有記錄（使用選擇性認證）
router.get('/all', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const logs = await TrainingLog.find({ userId })
      .populate('exerciseId')
      .sort({ date: -1 });
    
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('獲取記錄錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取記錄失敗',
      error: error.message
    });
  }
});

// 獲取 PR 記錄（使用選擇性認證）
router.get('/pr', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const prLogs = await TrainingLog.find({ 
      userId, 
      isPR: true 
    })
      .populate('exerciseId')
      .sort({ date: -1 });
    
    res.json({
      success: true,
      count: prLogs.length,
      logs: prLogs
    });
  } catch (error) {
    console.error('獲取 PR 記錄錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取 PR 記錄失敗',
      error: error.message
    });
  }
});

// 獲取特定動作的 PR（使用選擇性認證）
router.get('/pr/:exerciseId', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { exerciseId } = req.params;
    
    const prLog = await TrainingLog.findOne({
      userId,
      exerciseId,
      isPR: true
    })
      .populate('exerciseId')
      .sort({ weight: -1 });
    
    if (!prLog) {
      return res.json({
        success: true,
        message: '尚無 PR 記錄',
        pr: null
      });
    }
    
    res.json({
      success: true,
      pr: prLog
    });
  } catch (error) {
    console.error('獲取 PR 錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取 PR 失敗',
      error: error.message
    });
  }
});

// 計算 1RM（使用選擇性認證）
router.get('/1rm/:exerciseId', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { exerciseId } = req.params;
    
    const logs = await TrainingLog.find({
      userId,
      exerciseId
    }).sort({ estimated1RM: -1 }).limit(5);
    
    if (logs.length === 0) {
      return res.json({
        success: true,
        message: '尚無記錄',
        estimated1RM: 0,
        history: []
      });
    }
    
    const maxLog = logs[0];
    
    res.json({
      success: true,
      estimated1RM: maxLog.estimated1RM,
      basedOn: {
        weight: maxLog.weight,
        reps: maxLog.reps,
        date: maxLog.date
      },
      history: logs.map(log => ({
        estimated1RM: log.estimated1RM,
        weight: log.weight,
        reps: log.reps,
        date: log.date
      }))
    });
  } catch (error) {
    console.error('計算 1RM 錯誤:', error);
    res.status(500).json({
      success: false,
      message: '計算 1RM 失敗',
      error: error.message
    });
  }
});

// 依日期獲取記錄（使用選擇性認證）
router.get('/date/:date', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const targetDate = new Date(req.params.date);
    
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: '無效的日期格式'
      });
    }
    
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
    
    const logs = await TrainingLog.find({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).populate('exerciseId');
    
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('獲取記錄錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取記錄失敗',
      error: error.message
    });
  }
});

// 刪除記錄（需要認證）
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const log = await TrainingLog.findById(req.params.id);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: '找不到該記錄'
      });
    }
    
    // 檢查權限
    if (log.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: '無權限刪除此記錄'
      });
    }
    
    await TrainingLog.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: '記錄已刪除'
    });
  } catch (error) {
    console.error('刪除記錄錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除失敗',
      error: error.message
    });
  }
});

// 獲取特定動作的記錄（使用選擇性認證）
router.get('/exercise/:exerciseId', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const logs = await TrainingLog.find({
      userId,
      exerciseId: req.params.exerciseId
    }).sort({ date: 1 });
    
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('獲取記錄錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取記錄失敗',
      error: error.message
    });
  }
});

module.exports = router;