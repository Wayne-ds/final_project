const express = require('express');
const router = express.Router();
const WorkoutPlan = require('../models/WorkoutPlan');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

// 獲取每週計畫（使用選擇性認證）
router.get('/weekly', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.userId; // 從 middleware 取得
    
    let plan = await WorkoutPlan.findOne({ userId })
      .populate('weeklyPlan.monday.exerciseId')
      .populate('weeklyPlan.tuesday.exerciseId')
      .populate('weeklyPlan.wednesday.exerciseId')
      .populate('weeklyPlan.thursday.exerciseId')
      .populate('weeklyPlan.friday.exerciseId')
      .populate('weeklyPlan.saturday.exerciseId')
      .populate('weeklyPlan.sunday.exerciseId');
    
    if (!plan) {
      // 建立空白計畫
      plan = new WorkoutPlan({
        userId,
        weeklyPlan: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: []
        }
      });
      await plan.save();
    }
    
    res.json({
      success: true,
      plan
    });
  } catch (error) {
    console.error('獲取計畫錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取計畫失敗',
      error: error.message
    });
  }
});

// 更新計畫（需要認證）
router.put('/update', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { weeklyPlan } = req.body;
    
    if (!weeklyPlan) {
      return res.status(400).json({
        success: false,
        message: '請提供計畫資料'
      });
    }
    
    let plan = await WorkoutPlan.findOne({ userId });
    
    if (!plan) {
      plan = new WorkoutPlan({ userId, weeklyPlan });
    } else {
      plan.weeklyPlan = weeklyPlan;
      plan.updatedAt = Date.now();
    }
    
    await plan.save();
    
    res.json({
      success: true,
      message: '計畫更新成功',
      plan
    });
  } catch (error) {
    console.error('更新計畫錯誤:', error);
    res.status(400).json({
      success: false,
      message: '計畫更新失敗',
      error: error.message
    });
  }
});

// 加入動作到計畫（需要認證）
router.post('/add', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { day, exerciseId, sets = 3, reps = 10 } = req.body;
    
    // 驗證日期
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (!validDays.includes(day)) {
      return res.status(400).json({
        success: false,
        message: '無效的日期'
      });
    }
    
    // 驗證動作 ID
    if (!exerciseId) {
      return res.status(400).json({
        success: false,
        message: '請提供動作 ID'
      });
    }
    
    // 驗證組數和次數
    if (sets < 1 || sets > 20) {
      return res.status(400).json({
        success: false,
        message: '組數必須在 1-20 之間'
      });
    }
    
    if (reps < 1 || reps > 100) {
      return res.status(400).json({
        success: false,
        message: '次數必須在 1-100 之間'
      });
    }
    
    let plan = await WorkoutPlan.findOne({ userId });
    
    if (!plan) {
      plan = new WorkoutPlan({ 
        userId,
        weeklyPlan: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: []
        }
      });
    }
    
    // 檢查是否已存在
    const exists = plan.weeklyPlan[day].some(
      item => item.exerciseId.toString() === exerciseId
    );
    
    if (exists) {
      return res.status(400).json({
        success: false,
        message: '該動作已在計畫中'
      });
    }
    
    plan.weeklyPlan[day].push({
      exerciseId,
      sets: parseInt(sets),
      reps: parseInt(reps),
      order: plan.weeklyPlan[day].length
    });
    
    plan.updatedAt = Date.now();
    await plan.save();
    
    res.json({
      success: true,
      message: '動作已加入計畫',
      plan
    });
  } catch (error) {
    console.error('加入動作錯誤:', error);
    res.status(400).json({
      success: false,
      message: '加入失敗',
      error: error.message
    });
  }
});

// 從計畫移除動作（需要認證）
router.delete('/remove', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { day, exerciseId } = req.body;
    
    // 驗證日期
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (!validDays.includes(day)) {
      return res.status(400).json({
        success: false,
        message: '無效的日期'
      });
    }
    
    if (!exerciseId) {
      return res.status(400).json({
        success: false,
        message: '請提供動作 ID'
      });
    }
    
    const plan = await WorkoutPlan.findOne({ userId });
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '找不到計畫'
      });
    }
    
    // 移除動作
    plan.weeklyPlan[day] = plan.weeklyPlan[day].filter(
      item => item.exerciseId.toString() !== exerciseId
    );
    
    plan.updatedAt = Date.now();
    await plan.save();
    
    res.json({
      success: true,
      message: '動作已移除',
      plan
    });
  } catch (error) {
    console.error('移除動作錯誤:', error);
    res.status(400).json({
      success: false,
      message: '移除失敗',
      error: error.message
    });
  }
});

module.exports = router;