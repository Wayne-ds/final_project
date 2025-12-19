const mongoose = require('mongoose');

const exerciseItemSchema = new mongoose.Schema({
  exerciseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true
  },
  sets: {
    type: Number,
    default: 3,
    min: 1,
    max: 20
  },
  reps: {
    type: Number,
    default: 10,
    min: 1,
    max: 100
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: false });

const workoutPlanSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    default: 'default-user'
  },
  planName: {
    type: String,
    default: '我的每週計畫'
  },
  weeklyPlan: {
    monday: [exerciseItemSchema],
    tuesday: [exerciseItemSchema],
    wednesday: [exerciseItemSchema],
    thursday: [exerciseItemSchema],
    friday: [exerciseItemSchema],
    saturday: [exerciseItemSchema],
    sunday: [exerciseItemSchema]
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WorkoutPlan', workoutPlanSchema);