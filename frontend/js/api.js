// ===== API 基礎設定 =====

// 自動檢測 API URL
const API_BASE_URL = (() => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }
  return 'https://final-project-tejz.onrender.com/api';
})();

// ===== 統一 API 請求函數 =====

let loadingCount = 0;

function showLoading() {
  if (loadingCount === 0) {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loading-overlay';
    overlay.innerHTML = '<div class="loading"></div>';
    document.body.appendChild(overlay);
  }
  loadingCount++;
}

function hideLoading() {
  loadingCount = Math.max(0, loadingCount - 1);
  if (loadingCount === 0) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 3000);
}

// 🆕 統一的 API 請求函數（自動處理認證）
async function apiRequest(endpoint, options = {}) {
  const token = getToken ? getToken() : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });
    
    // 處理 401 未授權
    if (response.status === 401) {
      if (typeof removeToken === 'function') {
        removeToken();
      }
      showNotification('登入已過期，請重新登入', 'warning');
      setTimeout(() => {
        window.location.href = '/pages/login.html';
      }, 1500);
      throw new Error('Unauthorized');
    }
    
    return response;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

// ===== 工具函數 =====

// HTML 轉義（防 XSS）
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 日期格式化
function formatDate(date, format = 'zh-TW') {
  const d = new Date(date);
  
  if (format === 'zh-TW') {
    return d.toLocaleDateString('zh-TW');
  }
  
  if (format === 'ISO') {
    return d.toISOString().split('T')[0];
  }
  
  if (format === 'datetime') {
    return d.toLocaleString('zh-TW');
  }
  
  if (format === 'time') {
    return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  }
  
  return d.toString();
}

// 數字驗證
function validateNumber(value, min, max, fieldName = '數值') {
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    throw new Error(`${fieldName}必須是數字`);
  }
  
  if (num < min || num > max) {
    throw new Error(`${fieldName}必須在 ${min}-${max} 之間`);
  }
  
  return num;
}

// ===== Exercise API =====

async function fetchExercises(includeCustom = true) {
  try {
    const params = new URLSearchParams({ includeCustom: includeCustom.toString() });
    const response = await apiRequest(`/exercises?${params}`);
    
    if (!response.ok) throw new Error('獲取動作列表失敗');
    
    const data = await response.json();
    return data.exercises;
  } catch (error) {
    console.error('Error:', error);
    if (error.message !== 'Unauthorized') {
      showNotification('獲取動作列表失敗', 'error');
    }
    return [];
  }
}

async function fetchExerciseById(id) {
  try {
    const response = await apiRequest(`/exercises/${id}`);
    
    if (!response.ok) throw new Error('獲取動作詳情失敗');
    
    const data = await response.json();
    return data.exercise;
  } catch (error) {
    console.error('Error:', error);
    if (error.message !== 'Unauthorized') {
      showNotification('獲取動作詳情失敗', 'error');
    }
    return null;
  }
}

async function createCustomExercise(exerciseData) {
  try {
    // 驗證必填欄位
    if (!exerciseData.name || !exerciseData.targetMuscle || 
        !exerciseData.equipment || !exerciseData.difficulty) {
      throw new Error('請填寫所有必填欄位');
    }
    
    showLoading();
    const response = await apiRequest('/exercises/custom', {
      method: 'POST',
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

async function updateCustomExercise(id, exerciseData) {
  try {
    showLoading();
    const response = await apiRequest(`/exercises/custom/${id}`, {
      method: 'PUT',
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

async function deleteCustomExercise(id) {
  try {
    const response = await apiRequest(`/exercises/custom/${id}`, {
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
    const response = await apiRequest('/plans/weekly');
    
    if (!response.ok) throw new Error('獲取訓練計畫失敗');
    
    const data = await response.json();
    return data.plan;
  } catch (error) {
    console.error('Error:', error);
    if (error.message !== 'Unauthorized') {
      showNotification('獲取訓練計畫失敗', 'error');
    }
    return null;
  }
}

async function updatePlan(weeklyPlan) {
  try {
    showLoading();
    const response = await apiRequest('/plans/update', {
      method: 'PUT',
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
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (!validDays.includes(day.toLowerCase())) {
      throw new Error('無效的日期');
    }
    
    const response = await apiRequest('/plans/add', {
      method: 'POST',
      body: JSON.stringify({ exerciseId, day: day.toLowerCase(), sets, reps })
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
    const response = await apiRequest('/plans/remove', {
      method: 'DELETE',
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
    // 驗證輸入
    validateNumber(weight, 0, 500, '重量');
    validateNumber(reps, 1, 100, '次數');
    validateNumber(sets, 1, 20, '組數');
    
    if (!exerciseId) {
      throw new Error('請選擇動作');
    }
    
    showLoading();
    const response = await apiRequest('/logs', {
      method: 'POST',
      body: JSON.stringify({
        exerciseId,
        weight: parseFloat(weight),
        reps: parseInt(reps),
        sets: parseInt(sets),
        notes: notes.trim(),
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
    showNotification(error.message, 'error');
    return null;
  }
}

async function updateTrainingLog(logId, weight, reps, sets, notes = '') {
  try {
    // 驗證輸入
    validateNumber(weight, 0, 500, '重量');
    validateNumber(reps, 1, 100, '次數');
    validateNumber(sets, 1, 20, '組數');
    
    showLoading();
    const response = await apiRequest(`/logs/${logId}`, {
      method: 'PUT',
      body: JSON.stringify({
        weight: parseFloat(weight),
        reps: parseInt(reps),
        sets: parseInt(sets),
        notes: notes.trim()
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
    showNotification(error.message, 'error');
    return null;
  }
}

async function fetchAllLogs() {
  try {
    const response = await apiRequest('/logs/all');
    
    if (!response.ok) throw new Error('獲取記錄失敗');
    
    const data = await response.json();
    return data.logs;
  } catch (error) {
    console.error('Error:', error);
    if (error.message !== 'Unauthorized') {
      showNotification('獲取記錄失敗', 'error');
    }
    return [];
  }
}

async function fetchLogsByDate(date) {
  try {
    const response = await apiRequest(`/logs/date/${date}`);
    
    if (!response.ok) throw new Error('獲取記錄失敗');
    
    const data = await response.json();
    return data.logs;
  } catch (error) {
    console.error('Error:', error);
    if (error.message !== 'Unauthorized') {
      showNotification('獲取記錄失敗', 'error');
    }
    return [];
  }
}

async function deleteLog(logId) {
  try {
    const response = await apiRequest(`/logs/${logId}`, {
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
    const response = await apiRequest(`/logs/exercise/${exerciseId}`);
    
    if (!response.ok) throw new Error('獲取記錄失敗');
    
    const data = await response.json();
    return data.logs;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

async function fetchPRLogs() {
  try {
    const response = await apiRequest('/logs/pr');
    
    if (!response.ok) throw new Error('獲取 PR 記錄失敗');
    
    const data = await response.json();
    return data.logs;
  } catch (error) {
    console.error('Error:', error);
    if (error.message !== 'Unauthorized') {
      showNotification('獲取 PR 記錄失敗', 'error');
    }
    return [];
  }
}

async function fetchExercisePR(exerciseId) {
  try {
    const response = await apiRequest(`/logs/pr/${exerciseId}`);
    
    if (!response.ok) throw new Error('獲取 PR 失敗');
    
    const data = await response.json();
    return data.pr;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

async function calculate1RM(exerciseId) {
  try {
    const response = await apiRequest(`/logs/1rm/${exerciseId}`);
    
    if (!response.ok) throw new Error('計算 1RM 失敗');
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// Epley 公式計算 1RM（客戶端計算）
function calculateEpley1RM(weight, reps) {
  const w = parseFloat(weight);
  const r = parseInt(reps);
  
  if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) {
    return 0;
  }
  
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30) * 10) / 10;
}