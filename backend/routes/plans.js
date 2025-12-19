const express = require('express');
const router = express.Router();
const WorkoutPlan = require('../models/WorkoutPlan');

// 獲取每週計畫
router.get('/weekly', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    let plan = await WorkoutPlan.findOne({ userId })
      .populate('weeklyPlan.monday.exerciseId')
      .populate('weeklyPlan.tuesday.exerciseId')
      .populate('weeklyPlan.wednesday.exerciseId')
      .populate('weeklyPlan.thursday.exerciseId')
      .populate('weeklyPlan.friday.exerciseId')
      .populate('weeklyPlan.saturday.exerciseId')
      .populate('weeklyPlan.sunday.exerciseId');
    
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
      await plan.save();
    }
    
    res.json({
      success: true,
      plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '獲取計畫失敗',
      error: error.message
    });
  }
});

// 更新計畫
router.put('/update', async (req, res) => {
  try {
    const { userId = 'default-user', weeklyPlan } = req.body;
    
    let plan = await WorkoutPlan.findOne({ userId });
    
    if (!plan) {
      plan = new WorkoutPlan({ userId, weeklyPlan });
    } else {
      plan.weeklyPlan = weeklyPlan;
    }
    
    await plan.save();
    
    res.json({
      success: true,
      message: '計畫更新成功',
      plan
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '計畫更新失敗',
      error: error.message
    });
  }
});

// 加入動作到計畫
router.post('/add', async (req, res) => {
  try {
    const { userId = 'default-user', day, exerciseId, sets = 3, reps = 10 } = req.body;
    
    if (!['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(day)) {
      return res.status(400).json({
        success: false,
        message: '無效的日期'
      });
    }
    
    let plan = await WorkoutPlan.findOne({ userId });
    
    if (!plan) {
      plan = new WorkoutPlan({ userId });
    }
    
    const exists = plan.weeklyPlan[day].some(item => item.exerciseId.toString() === exerciseId);
    
    if (exists) {
      return res.status(400).json({
        success: false,
        message: '該動作已在計畫中'
      });
    }
    
    plan.weeklyPlan[day].push({
      exerciseId,
      sets,
      reps,
      order: plan.weeklyPlan[day].length
    });
    
    await plan.save();
    
    res.json({
      success: true,
      message: '動作已加入計畫',
      plan
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '加入失敗',
      error: error.message
    });
  }
});

// 從計畫移除動作
router.delete('/remove', async (req, res) => {
  try {
    const { userId = 'default-user', day, exerciseId } = req.body;
    
    const plan = await WorkoutPlan.findOne({ userId });
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '找不到計畫'
      });
    }
    
    plan.weeklyPlan[day] = plan.weeklyPlan[day].filter(
      item => item.exerciseId.toString() !== exerciseId
    );
    
    await plan.save();
    
    res.json({
      success: true,
      message: '動作已移除',
      plan
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '移除失敗',
      error: error.message
    });
  }
});

module.exports = router;