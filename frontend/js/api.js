// API 基礎 URL
const API_BASE_URL = 'https://final-project-tejz.onrender.com/api';

// ===== 工具函數 =====

function showLoading() {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.id = 'loading-overlay';
  overlay.innerHTML = '<div class="loading"></div>';
  document.body.appendChild(overlay);
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.remove();
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 3000);
}

// ===== Exercise API =====

async function fetchExercises() {
  try {
    const response = await fetch(`${API_BASE_URL}/exercises`);
    if (!response.ok) throw new Error('獲取動作列表失敗');
    const data = await response.json();
    return data.exercises;
  } catch (error) {
    console.error('Error:', error);
    showNotification('獲取動作列表失敗', 'error');
    return [];
  }
}

async function fetchExerciseById(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/exercises/${id}`);
    if (!response.ok) throw new Error('獲取動作詳情失敗');
    const data = await response.json();
    return data.exercise;
  } catch (error) {
    console.error('Error:', error);
    showNotification('獲取動作詳情失敗', 'error');
    return null;
  }
}

// 🆕 新增自訂動作
async function createCustomExercise(exerciseData) {
  try {
    showLoading();
    const response = await fetch(`${API_BASE_URL}/exercises/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exerciseData)
    });
    
    hideLoading();
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || '新增失敗');
    }
    
    const data = await response.json();
    showNotification('自訂動作新增成功！', 'success');
    return data.exercise;
  } catch (error) {
    hideLoading();
    console.error('Error:', error);
    showNotification(error.message, 'error');
    return null;
  }
}

// 🆕 更新自訂動作
async function updateCustomExercise(id, exerciseData) {
  try {
    showLoading();
    const response = await fetch(`${API_BASE_URL}/exercises/custom/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exerciseData)
    });
    
    hideLoading();
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || '更新失敗');
    }
    
    const data = await response.json();
    showNotification('動作更新成功！', 'success');
    return data.exercise;
  } catch (error) {
    hideLoading();
    console.error('Error:', error);
    showNotification(error.message, 'error');
    return null;
  }
}

// 🆕 刪除自訂動作
async function deleteCustomExercise(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/exercises/custom/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('刪除失敗');
    
    showNotification('動作已刪除', 'success');
    return true;
  } catch (error) {
    console.error('Error:', error);
    showNotification('刪除失敗', 'error');
    return false;
  }
}

// ===== Workout Plan API =====

async function fetchWeeklyPlan() {
  try {
    const response = await fetch(`${API_BASE_URL}/plans/weekly`);
    if (!response.ok) throw new Error('獲取訓練計畫失敗');
    const data = await response.json();
    return data.plan;
  } catch (error) {
    console.error('Error:', error);
    showNotification('獲取訓練計畫失敗', 'error');
    return null;
  }
}

async function updatePlan(weeklyPlan) {
  try {
    showLoading();
    const response = await fetch(`${API_BASE_URL}/plans/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weeklyPlan })
    });
    
    hideLoading();
    
    if (!response.ok) throw new Error('更新計畫失敗');
    
    const data = await response.json();
    showNotification('計畫更新成功', 'success');
    return data.plan;
  } catch (error) {
    hideLoading();
    console.error('Error:', error);
    showNotification('更新計畫失敗', 'error');
    return null;
  }
}

async function addExerciseToPlan(exerciseId, day, sets = 3, reps = 10) {
  try {
    const response = await fetch(`${API_BASE_URL}/plans/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId, day, sets, reps })
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || '加入計畫失敗');
    }
    
    const data = await response.json();
    showNotification(data.message || '動作已加入計畫', 'success');
    return data.plan;
  } catch (error) {
    console.error('Error:', error);
    showNotification(error.message, 'error');
    return null;
  }
}

async function removeExerciseFromPlan(exerciseId, day) {
  try {
    const response = await fetch(`${API_BASE_URL}/plans/remove`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId, day })
    });
    
    if (!response.ok) throw new Error('移除動作失敗');
    
    const data = await response.json();
    showNotification('動作已移除', 'success');
    return data.plan;
  } catch (error) {
    console.error('Error:', error);
    showNotification('移除動作失敗', 'error');
    return null;
  }
}

// ===== Training Log API =====

async function createTrainingLog(exerciseId, weight, reps, sets, notes = '') {
  try {
    showLoading();
    const response = await fetch(`${API_BASE_URL}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exerciseId,
        weight: parseFloat(weight),
        reps: parseInt(reps),
        sets: parseInt(sets),
        notes,
        date: new Date().toISOString()
      })
    });
    
    hideLoading();
    
    if (!response.ok) throw new Error('記錄失敗');
    
    const data = await response.json();
    showNotification('記錄成功！', 'success');
    return data.log;
  } catch (error) {
    hideLoading();
    console.error('Error:', error);
    showNotification('記錄失敗', 'error');
    return null;
  }
}

// 🆕 更新訓練記錄
async function updateTrainingLog(logId, weight, reps, sets, notes = '') {
  try {
    showLoading();
    const response = await fetch(`${API_BASE_URL}/logs/${logId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weight: parseFloat(weight),
        reps: parseInt(reps),
        sets: parseInt(sets),
        notes
      })
    });
    
    hideLoading();
    
    if (!response.ok) throw new Error('更新失敗');
    
    const data = await response.json();
    showNotification('記錄更新成功！', 'success');
    return data.log;
  } catch (error) {
    hideLoading();
    console.error('Error:', error);
    showNotification('更新失敗', 'error');
    return null;
  }
}

async function fetchAllLogs() {
  try {
    const response = await fetch(`${API_BASE_URL}/logs/all`);
    if (!response.ok) throw new Error('獲取記錄失敗');
    const data = await response.json();
    return data.logs;
  } catch (error) {
    console.error('Error:', error);
    showNotification('獲取記錄失敗', 'error');
    return [];
  }
}

async function fetchLogsByDate(date) {
  try {
    const response = await fetch(`${API_BASE_URL}/logs/date/${date}`);
    if (!response.ok) throw new Error('獲取記錄失敗');
    const data = await response.json();
    return data.logs;
  } catch (error) {
    console.error('Error:', error);
    showNotification('獲取記錄失敗', 'error');
    return [];
  }
}

async function deleteLog(logId) {
  try {
    const response = await fetch(`${API_BASE_URL}/logs/${logId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('刪除失敗');
    
    showNotification('記錄已刪除', 'success');
    return true;
  } catch (error) {
    console.error('Error:', error);
    showNotification('刪除失敗', 'error');
    return false;
  }
}

async function fetchLogsByExercise(exerciseId) {
  try {
    const response = await fetch(`${API_BASE_URL}/logs/exercise/${exerciseId}`);
    if (!response.ok) throw new Error('獲取記錄失敗');
    const data = await response.json();
    return data.logs;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

// 🆕 獲取 PR 記錄
async function fetchPRLogs() {
  try {
    const response = await fetch(`${API_BASE_URL}/logs/pr`);
    if (!response.ok) throw new Error('獲取 PR 記錄失敗');
    const data = await response.json();
    return data.logs;
  } catch (error) {
    console.error('Error:', error);
    showNotification('獲取 PR 記錄失敗', 'error');
    return [];
  }
}

// 🆕 獲取特定動作的 PR
async function fetchExercisePR(exerciseId) {
  try {
    const response = await fetch(`${API_BASE_URL}/logs/pr/${exerciseId}`);
    if (!response.ok) throw new Error('獲取 PR 失敗');
    const data = await response.json();
    return data.pr;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// 🆕 計算 1RM
async function calculate1RM(exerciseId) {
  try {
    const response = await fetch(`${API_BASE_URL}/logs/1rm/${exerciseId}`);
    if (!response.ok) throw new Error('計算 1RM 失敗');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// 🆕 Epley 公式計算 1RM（客戶端計算）
function calculateEpley1RM(weight, reps) {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}