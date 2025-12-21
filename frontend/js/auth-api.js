// ===== Auth 相關 API =====

// Token 管理
function getToken() {
  const token = localStorage.getItem('fitmotion_token');
  if (!token) return null;
  
  try {
    // 檢查 Token 是否過期
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // JWT exp 是以秒為單位，需要轉換為毫秒
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.log('Token 已過期');
      removeToken();
      return null;
    }
    
    return token;
  } catch (error) {
    console.error('Token 解析失敗:', error);
    removeToken();
    return null;
  }
}

function saveToken(token) {
  if (!token) {
    console.error('嘗試儲存空 Token');
    return;
  }
  localStorage.setItem('fitmotion_token', token);
}

function removeToken() {
  localStorage.removeItem('fitmotion_token');
  localStorage.removeItem('fitmotion_user');
}

// 用戶資料管理
function getUser() {
  const userStr = localStorage.getItem('fitmotion_user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('用戶資料解析失敗:', error);
    return null;
  }
}

function saveUser(user) {
  if (!user) {
    console.error('嘗試儲存空用戶資料');
    return;
  }
  localStorage.setItem('fitmotion_user', JSON.stringify(user));
}

// 檢查是否登入
function isLoggedIn() {
  return !!getToken();
}

// 取得當前用戶 ID
function getCurrentUserId() {
  const user = getUser();
  return user ? user.id : null;
}

// 註冊
async function register(username, email, password, displayName) {
  try {
    // 客戶端驗證
    if (!username || username.length < 3 || username.length > 20) {
      throw new Error('用戶名必須為 3-20 個字元');
    }
    
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new Error('請輸入有效的電子郵件');
    }
    
    if (!password || password.length < 6) {
      throw new Error('密碼至少需要 6 個字元');
    }
    
    showLoading();
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: username.trim(), 
        email: email.trim(), 
        password, 
        displayName: displayName ? displayName.trim() : username.trim()
      })
    });
    
    hideLoading();
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '註冊失敗');
    }
    
    // 儲存 Token 和用戶資料
    saveToken(data.token);
    saveUser(data.user);
    
    showNotification(data.message || '註冊成功！', 'success');
    return data;
  } catch (error) {
    hideLoading();
    console.error('註冊錯誤:', error);
    showNotification(error.message, 'error');
    return null;
  }
}

// 登入
async function login(username, password) {
  try {
    // 客戶端驗證
    if (!username || !password) {
      throw new Error('請輸入用戶名和密碼');
    }
    
    showLoading();
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: username.trim(), 
        password 
      })
    });
    
    hideLoading();
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '登入失敗');
    }
    
    // 儲存 Token 和用戶資料
    saveToken(data.token);
    saveUser(data.user);
    
    showNotification(data.message || '登入成功！', 'success');
    return data;
  } catch (error) {
    hideLoading();
    console.error('登入錯誤:', error);
    showNotification(error.message, 'error');
    return null;
  }
}

// 登出
function logout() {
  removeToken();
  showNotification('已登出', 'info');
  
  // 延遲跳轉，讓用戶看到通知
  setTimeout(() => {
    // 檢查當前頁面，決定跳轉位置
    const currentPath = window.location.pathname;
    if (currentPath.includes('/pages/')) {
      window.location.href = '/pages/login.html';
    } else {
      window.location.href = '/index.html';
    }
  }, 500);
}

// 驗證 Token
async function verifyToken() {
  try {
    const token = getToken();
    
    if (!token) {
      console.log('沒有 Token');
      return false;
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.log('Token 驗證失敗');
      removeToken();
      return false;
    }
    
    const data = await response.json();
    
    if (data.success) {
      saveUser(data.user);
      return true;
    }
    
    removeToken();
    return false;
  } catch (error) {
    console.error('驗證錯誤:', error);
    removeToken();
    return false;
  }
}

// 取得用戶資料
async function fetchProfile() {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('未登入');
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || '取得資料失敗');
    }
    
    const data = await response.json();
    saveUser(data.user);
    return data.user;
  } catch (error) {
    console.error('取得資料錯誤:', error);
    showNotification(error.message, 'error');
    return null;
  }
}

// 更新用戶資料
async function updateProfile(displayName, email, avatar) {
  try {
    // 驗證 email 格式
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      throw new Error('請輸入有效的電子郵件');
    }
    
    showLoading();
    const token = getToken();
    
    if (!token) {
      throw new Error('未登入');
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        displayName: displayName ? displayName.trim() : undefined,
        email: email ? email.trim() : undefined,
        avatar: avatar ? avatar.trim() : undefined
      })
    });
    
    hideLoading();
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '更新失敗');
    }
    
    saveUser(data.user);
    showNotification(data.message || '更新成功！', 'success');
    return data.user;
  } catch (error) {
    hideLoading();
    console.error('更新錯誤:', error);
    showNotification(error.message, 'error');
    return null;
  }
}

// 🆕 檢查頁面是否需要登入（改進版）
async function requireAuth(redirectUrl = '/pages/login.html') {
  const token = getToken();
  
  // 沒有 Token，直接跳轉
  if (!token) {
    showNotification('請先登入', 'warning');
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 1000);
    return false;
  }
  
  // 驗證 Token 有效性
  const isValid = await verifyToken();
  
  if (!isValid) {
    showNotification('登入已過期，請重新登入', 'warning');
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 1000);
    return false;
  }
  
  return true;
}

// 🆕 更新導航列用戶資訊（改進版）
function updateNavbarUser() {
  const user = getUser();
  const navbarContainer = document.querySelector('.navbar .container');
  
  if (!navbarContainer) {
    console.warn('找不到導航列容器');
    return;
  }
  
  // 移除舊的用戶選單
  const oldUserMenu = document.getElementById('user-menu');
  if (oldUserMenu) oldUserMenu.remove();
  
  // 移除登入/註冊按鈕
  const authButtons = document.getElementById('auth-buttons');
  if (authButtons) authButtons.remove();
  
  if (user) {
    // 建立用戶選單
    const userMenu = document.createElement('div');
    userMenu.id = 'user-menu';
    userMenu.style.cssText = 'display: flex; align-items: center; gap: 1rem; margin-left: auto;';
    
    // 安全處理用戶名（防 XSS）
    const displayName = document.createElement('span');
    displayName.style.color = 'white';
    displayName.textContent = `👋 ${user.displayName || user.username}`;
    
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-outline';
    logoutBtn.style.cssText = 'padding: 0.5rem 1rem; font-size: 0.9rem;';
    logoutBtn.textContent = '登出';
    logoutBtn.onclick = logout;
    
    userMenu.appendChild(displayName);
    userMenu.appendChild(logoutBtn);
    navbarContainer.appendChild(userMenu);
  }
}

// 🆕 初始化認證狀態（用於首頁等公開頁面）
async function initAuthState() {
  if (isLoggedIn()) {
    const isValid = await verifyToken();
    
    if (isValid) {
      updateNavbarUser();
      
      // 如果在登入頁面且已登入，跳轉到首頁
      const currentPath = window.location.pathname;
      if (currentPath.includes('login.html') || currentPath.includes('register.html')) {
        window.location.href = '/index.html';
      }
    }
  }
}