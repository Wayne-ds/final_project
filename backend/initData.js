require('dotenv').config();
const mongoose = require('mongoose');
const Exercise = require('./models/Exercise');
const exercisesData = require('./data/exercises.json');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB 連接成功');
    
    // 清空現有資料
    await Exercise.deleteMany({});
    console.log('🗑️  清空舊資料');
    
    // 匯入新資料
    await Exercise.insertMany(exercisesData);
    console.log(`✅ 成功匯入 ${exercisesData.length} 個動作`);
    
    console.log('🎉 資料初始化完成！');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 錯誤:', err);
    process.exit(1);
  });