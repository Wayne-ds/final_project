const express = require('express');
const router = express.Router();
const Exercise = require('../models/Exercise');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

// 獲取所有動作（使用選擇性認證）
router.get('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.userId; // 從 middleware 取得
    const { includeCustom = 'true' } = req.query;
    
    let query = {};
    
    if (includeCustom === 'true') {
      query = {
        $or: [
          { isCustom: false },
          { isCustom: true, createdBy: userId }
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
    console.error('獲取動作列表錯誤:', error);
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
    console.error('獲取動作詳情錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取動作詳情失敗',
      error: error.message
    });
  }
});

// 🆕 新增自訂動作（需要認證）
router.post('/custom', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId; // 從 middleware 取得
    const { 
      name, 
      targetMuscle, 
      equipment, 
      difficulty, 
      instructions = [], 
      tips = [],
      videoUrl = '',
      imageUrl = ''
    } = req.body;
    
    // 驗證必填欄位
    if (!name || !targetMuscle || !equipment || !difficulty) {
      return res.status(400).json({
        success: false,
        message: '請填寫所有必填欄位'
      });
    }
    
    // 驗證欄位值
    const validMuscles = ['胸肌', '背肌', '腿部', '肩膀', '手臂', '核心'];
    const validEquipment = ['啞鈴', '槓鈴', '機械', '徒手', '彈力帶', '壺鈴', '其他'];
    const validDifficulty = ['初級', '中級', '高級'];
    
    if (!validMuscles.includes(targetMuscle)) {
      return res.status(400).json({
        success: false,
        message: '無效的目標部位'
      });
    }
    
    if (!validEquipment.includes(equipment)) {
      return res.status(400).json({
        success: false,
        message: '無效的器材類型'
      });
    }
    
    if (!validDifficulty.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: '無效的難度等級'
      });
    }
    
    const exercise = new Exercise({
      name: name.trim(),
      targetMuscle,
      equipment,
      difficulty,
      instructions,
      tips,
      videoUrl: videoUrl.trim(),
      imageUrl: imageUrl.trim() || 'https://via.placeholder.com/300x200?text=Custom+Exercise',
      isCustom: true,
      createdBy: userId // 使用 Token 中的 userId
    });
    
    await exercise.save();
    
    res.status(201).json({
      success: true,
      message: '自訂動作新增成功',
      exercise
    });
  } catch (error) {
    console.error('新增自訂動作錯誤:', error);
    res.status(400).json({
      success: false,
      message: '新增自訂動作失敗',
      error: error.message
    });
  }
});

// 🆕 更新自訂動作（需要認證）
router.put('/custom/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
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
        if (field === 'name' || field === 'videoUrl' || field === 'imageUrl') {
          exercise[field] = req.body[field].trim();
        } else {
          exercise[field] = req.body[field];
        }
      }
    });
    
    await exercise.save();
    
    res.json({
      success: true,
      message: '動作更新成功',
      exercise
    });
  } catch (error) {
    console.error('更新動作錯誤:', error);
    res.status(400).json({
      success: false,
      message: '更新動作失敗',
      error: error.message
    });
  }
});

// 🆕 刪除自訂動作（需要認證）
router.delete('/custom/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
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
    console.error('刪除動作錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除失敗',
      error: error.message
    });
  }
});

// 原有的新增動作 API (保留相容性，但現在需要認證)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const exercise = new Exercise(req.body);
    await exercise.save();
    
    res.status(201).json({
      success: true,
      message: '動作新增成功',
      exercise
    });
  } catch (error) {
    console.error('新增動作錯誤:', error);
    res.status(400).json({
      success: false,
      message: '動作新增失敗',
      error: error.message
    });
  }
});

module.exports = router;