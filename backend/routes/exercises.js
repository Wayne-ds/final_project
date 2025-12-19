const express = require('express');
const router = express.Router();
const Exercise = require('../models/Exercise');

// 獲取所有動作（包含自訂）
router.get('/', async (req, res) => {
  try {
    const { userId = 'default-user', includeCustom = 'true' } = req.query;
    
    let query = {};
    
    // 如果要包含自訂動作
    if (includeCustom === 'true') {
      query = {
        $or: [
          { isCustom: false }, // 預設動作
          { isCustom: true, createdBy: userId } // 用戶自訂動作
        ]
      };
    } else {
      query = { isCustom: false };
    }
    
    const exercises = await Exercise.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: exercises.length,
      exercises
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '獲取動作列表失敗',
      error: error.message
    });
  }
});

// 獲取單一動作
router.get('/:id', async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    
    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: '找不到該動作'
      });
    }
    
    res.json({
      success: true,
      exercise
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '獲取動作詳情失敗',
      error: error.message
    });
  }
});

// 🆕 新增自訂動作
router.post('/custom', async (req, res) => {
  try {
    const { 
      name, 
      targetMuscle, 
      equipment, 
      difficulty, 
      instructions = [], 
      tips = [],
      videoUrl = '',
      imageUrl = '',
      userId = 'default-user'
    } = req.body;
    
    // 驗證必填欄位
    if (!name || !targetMuscle || !equipment || !difficulty) {
      return res.status(400).json({
        success: false,
        message: '請填寫所有必填欄位'
      });
    }
    
    const exercise = new Exercise({
      name,
      targetMuscle,
      equipment,
      difficulty,
      instructions,
      tips,
      videoUrl,
      imageUrl,
      isCustom: true,
      createdBy: userId
    });
    
    await exercise.save();
    
    res.status(201).json({
      success: true,
      message: '自訂動作新增成功',
      exercise
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '新增自訂動作失敗',
      error: error.message
    });
  }
});

// 🆕 更新自訂動作
router.put('/custom/:id', async (req, res) => {
  try {
    const { userId = 'default-user' } = req.body;
    const exercise = await Exercise.findById(req.params.id);
    
    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: '找不到該動作'
      });
    }
    
    // 檢查是否為自訂動作且屬於該用戶
    if (!exercise.isCustom || exercise.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: '無權限編輯此動作'
      });
    }
    
    // 更新欄位
    const allowedUpdates = ['name', 'targetMuscle', 'equipment', 'difficulty', 'instructions', 'tips', 'videoUrl', 'imageUrl'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        exercise[field] = req.body[field];
      }
    });
    
    await exercise.save();
    
    res.json({
      success: true,
      message: '動作更新成功',
      exercise
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '更新動作失敗',
      error: error.message
    });
  }
});

// 🆕 刪除自訂動作
router.delete('/custom/:id', async (req, res) => {
  try {
    const { userId = 'default-user' } = req.query;
    const exercise = await Exercise.findById(req.params.id);
    
    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: '找不到該動作'
      });
    }
    
    // 檢查權限
    if (!exercise.isCustom || exercise.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: '無權限刪除此動作'
      });
    }
    
    await Exercise.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: '動作已刪除'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '刪除失敗',
      error: error.message
    });
  }
});

// 原有的新增動作 API (保留相容性)
router.post('/', async (req, res) => {
  try {
    const exercise = new Exercise(req.body);
    await exercise.save();
    
    res.status(201).json({
      success: true,
      message: '動作新增成功',
      exercise
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '動作新增失敗',
      error: error.message
    });
  }
});

module.exports = router;