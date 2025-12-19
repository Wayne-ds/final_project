const express = require('express');
const router = express.Router();
const TrainingLog = require('../models/TrainingLog');

// 新增訓練記錄
router.post('/', async (req, res) => {
  try {
    const { userId = 'default-user', exerciseId, weight, reps, sets, notes, date } = req.body;
    
    const log = new TrainingLog({
      userId,
      exerciseId,
      weight,
      reps,
      sets,
      notes,
      date: date || Date.now()
    });
    
    await log.save();
    
    // Populate exercise 資訊
    await log.populate('exerciseId');
    
    res.status(201).json({
      success: true,
      message: '記錄成功',
      log
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '記錄失敗',
      error: error.message
    });
  }
});

// 🆕 更新訓練記錄
router.put('/:id', async (req, res) => {
  try {
    const { weight, reps, sets, notes } = req.body;
    const log = await TrainingLog.findById(req.params.id);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: '找不到該記錄'
      });
    }
    
    // 更新欄位
    if (weight !== undefined) log.weight = weight;
    if (reps !== undefined) log.reps = reps;
    if (sets !== undefined) log.sets = sets;
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
    res.status(400).json({
      success: false,
      message: '更新失敗',
      error: error.message
    });
  }
});

// 獲取所有記錄
router.get('/all', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    const logs = await TrainingLog.find({ userId })
      .populate('exerciseId')
      .sort({ date: -1 });
    
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '獲取記錄失敗',
      error: error.message
    });
  }
});

// 🆕 獲取 PR 記錄
router.get('/pr', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    
    // 獲取所有 PR 記錄
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
    res.status(500).json({
      success: false,
      message: '獲取 PR 記錄失敗',
      error: error.message
    });
  }
});

// 🆕 獲取特定動作的 PR
router.get('/pr/:exerciseId', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    const { exerciseId } = req.params;
    
    // 找出該動作的最高重量記錄
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
    res.status(500).json({
      success: false,
      message: '獲取 PR 失敗',
      error: error.message
    });
  }
});

// 🆕 計算 1RM（基於歷史記錄）
router.get('/1rm/:exerciseId', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    const { exerciseId } = req.params;
    
    // 找出該動作的最高 1RM 估算
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
    res.status(500).json({
      success: false,
      message: '計算 1RM 失敗',
      error: error.message
    });
  }
});

// 依日期獲取記錄
router.get('/date/:date', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    const targetDate = new Date(req.params.date);
    
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
    res.status(500).json({
      success: false,
      message: '獲取記錄失敗',
      error: error.message
    });
  }
});

// 刪除記錄
router.delete('/:id', async (req, res) => {
  try {
    const log = await TrainingLog.findByIdAndDelete(req.params.id);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: '找不到該記錄'
      });
    }
    
    res.json({
      success: true,
      message: '記錄已刪除'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '刪除失敗',
      error: error.message
    });
  }
});

// 獲取特定動作的記錄
router.get('/exercise/:exerciseId', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
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
    res.status(500).json({
      success: false,
      message: '獲取記錄失敗',
      error: error.message
    });
  }
});

module.exports = router;