// 全局变量存储认证信息
let currentAuthCredentials = null;

// --- 初始化：恢复状态与图标 ---
chrome.storage.local.get(['authCreds', 'currentConfig'], (result) => {
  // 1. 恢复认证凭据
  if (result.authCreds) {
    currentAuthCredentials = result.authCreds;
  }
  // 2. 恢复图标显示 (防止浏览器重启后图标丢失)
  if (result.currentConfig) {
    updateBadge(result.currentConfig);
  } else {
    // 默认状态
    updateBadge({ mode: 'direct' });
  }
});

// --- 消息监听 ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SET_PROXY') {
    setProxy(request.profile);
    sendResponse({ status: 'success' });
  } else if (request.type === 'SET_DIRECT') {
    clearProxy('direct');
    sendResponse({ status: 'success' });
  } else if (request.type === 'SET_SYSTEM') {
    clearProxy('system');
    sendResponse({ status: 'success' });
  }
  return true; 
});

// --- 核心功能函数 ---

// 1. 设置代理
function setProxy(profile) {
  // 构建配置
  const config = {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: profile.scheme,
        host: profile.host,
        port: parseInt(profile.port)
      },
      bypassList: profile.bypassList.concat(["<local>"])
    }
  };

  // 处理认证
  if (profile.auth) {
    currentAuthCredentials = {
      username: profile.user,
      password: profile.pass
    };
    chrome.storage.local.set({ authCreds: currentAuthCredentials });
  } else {
    currentAuthCredentials = null;
    chrome.storage.local.remove('authCreds');
  }

  // 应用设置到 Chrome
  chrome.proxy.settings.set(
    { value: config, scope: 'regular' },
    () => {
      // 构造新的状态对象
      const newConfigState = { 
        mode: 'fixed_servers', 
        id: profile.id, 
        name: profile.name,
        rules: config.rules 
      };

      // 保存状态并更新图标
      chrome.storage.local.set({ currentConfig: newConfigState });
      updateBadge(newConfigState);
    }
  );
}

// 2. 清除代理 (直连/系统)
function clearProxy(mode) {
  currentAuthCredentials = null;
  chrome.storage.local.remove('authCreds');
  
  const config = { mode: mode };
  chrome.proxy.settings.set(
    { value: config, scope: 'regular' },
    () => {
      const newConfigState = { mode: mode };
      
      // 保存状态并更新图标
      chrome.storage.local.set({ currentConfig: newConfigState });
      updateBadge(newConfigState);
    }
  );
}

// 3. 处理代理认证 (自动填充密码)
chrome.webRequest.onAuthRequired.addListener(
  function(details) {
    if (details.isProxy && currentAuthCredentials) {
      console.log("Auto-filling proxy credentials...");
      return {
        authCredentials: {
          username: currentAuthCredentials.username,
          password: currentAuthCredentials.password
        }
      };
    }
    return {};
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// --- 辅助函数：更新动态图标 ---
function updateBadge(config) {
  if (config.mode === 'direct') {
    // 直连模式：显示灰色 OFF
    chrome.action.setBadgeText({ text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: "#9E9E9E" }); 
  } else if (config.mode === 'system') {
    // 系统模式：显示灰色 SYS
    chrome.action.setBadgeText({ text: "SYS" });
    chrome.action.setBadgeBackgroundColor({ color: "#9E9E9E" });
  } else if (config.mode === 'fixed_servers' && config.name) {
    // 代理模式：显示蓝色首字母
    // 使用 Array.from 可以正确处理 Emoji (例如 "🇺🇸" 算一个字符)
    const firstChar = Array.from(config.name.trim())[0] || "P";
    
    chrome.action.setBadgeText({ text: firstChar });
    chrome.action.setBadgeBackgroundColor({ color: "#2196F3" }); // 蓝色背景
  } else {
    // 未知状态
    chrome.action.setBadgeText({ text: "" });
  }
}