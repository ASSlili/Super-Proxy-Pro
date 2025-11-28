document.addEventListener('DOMContentLoaded', () => {
  // --- UI 元素引用 ---
  // Tab 和 视图
  const tabSwitch = document.getElementById('tab-switch');
  const tabManage = document.getElementById('tab-manage');
  const viewSwitch = document.getElementById('view-switch');
  const viewManage = document.getElementById('view-manage');
  
  // 状态栏
  const currentStatusSpan = document.getElementById('current-status');
  const currentDetailP = document.getElementById('current-detail');
  
  // IP 检测
  const ipAddressSpan = document.getElementById('ip-address');
  const ipCountrySpan = document.getElementById('ip-country');
  const btnRefreshIp = document.getElementById('btn-refresh-ip');
  const ipIndicator = document.getElementById('ip-indicator');

  // 列表容器
  const proxyListDiv = document.getElementById('proxy-list');
  const savedList = document.getElementById('saved-list');

  // 表单与按钮
  const proxyForm = document.getElementById('proxy-form');
  const btnSave = document.getElementById('btn-save');
  const btnCancel = document.getElementById('btn-cancel');
  const inputId = document.getElementById('p-id');

  // 导入导出
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const fileInput = document.getElementById('file-input');

  // --- 1. Tab 切换逻辑 ---
  tabSwitch.addEventListener('click', () => switchTab('switch'));
  tabManage.addEventListener('click', () => switchTab('manage'));

  function switchTab(tabName) {
    if (tabName === 'switch') {
      viewSwitch.classList.add('active');
      viewManage.classList.remove('active');
      tabSwitch.classList.add('active');
      tabManage.classList.remove('active');
      renderProxyList();
      checkCurrentIP(); // 切换回主页时自动刷新IP
    } else {
      viewManage.classList.add('active');
      viewSwitch.classList.remove('active');
      tabManage.classList.add('active');
      tabSwitch.classList.remove('active');
      renderManageList();
    }
  }

  // --- 2. 存储操作 (CRUD 基础) ---
  function getProfiles(callback) {
    chrome.storage.local.get(['profiles', 'currentConfig'], (result) => {
      callback(result.profiles || [], result.currentConfig || { mode: 'direct' });
    });
  }

  function saveProfilesToStorage(profiles, callback) {
    chrome.storage.local.set({ profiles }, callback);
  }

  // --- 3. 渲染主页面 (切换列表) ---
  function renderProxyList() {
    getProfiles((profiles, currentConfig) => {
      updateStatusUI(currentConfig);
      
      proxyListDiv.innerHTML = '';
      if (profiles.length === 0) {
        proxyListDiv.innerHTML = '<div style="text-align:center;padding:20px;color:#999;font-size:12px">暂无节点，请前往配置管理添加</div>';
        return;
      }

      profiles.forEach(p => {
        const div = document.createElement('div');
        div.className = 'proxy-item';
        // 高亮当前选中的代理
        if (currentConfig.mode === 'fixed_servers' && currentConfig.id === p.id) {
          div.classList.add('active');
        }

        div.innerHTML = `
          <div style="flex:1">
            <div class="proxy-info">${p.name}</div>
            <div class="proxy-sub">
              <span style="background:#eee;padding:1px 4px;border-radius:3px;font-size:10px">${p.scheme.toUpperCase()}</span> 
              ${p.host}:${p.port}
            </div>
          </div>
          <div style="font-size:16px;">
            ${p.auth ? '<span title="有密码保护">🔒</span>' : ''}
          </div>
        `;
        
        div.addEventListener('click', () => applyProxy(p));
        proxyListDiv.appendChild(div);
      });
    });
  }

  // --- 4. 渲染管理页面 (编辑列表) ---
  function renderManageList() {
    getProfiles((profiles) => {
      savedList.innerHTML = '';
      if (profiles.length === 0) {
        savedList.innerHTML = '<li style="padding:10px;text-align:center;color:#999;font-size:12px">列表为空</li>';
        return;
      }
      profiles.forEach((p, index) => {
        const li = document.createElement('li');
        li.className = 'manage-item';
        li.innerHTML = `
          <div class="manage-info">
            <b>${p.name}</b> <span style="color:#888;font-size:11px">(${p.host})</span>
          </div>
          <div class="manage-actions">
            <button type="button" class="edit-btn" data-index="${index}">编辑</button>
            <button type="button" class="delete-btn" data-index="${index}">删除</button>
          </div>
        `;
        savedList.appendChild(li);
      });

      // 绑定编辑事件
      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = e.target.getAttribute('data-index');
          loadProfileToForm(profiles[idx]);
        });
      });

      // 绑定删除事件
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          if(confirm('确定要删除此配置吗？')) {
            const idx = e.target.getAttribute('data-index');
            profiles.splice(idx, 1);
            saveProfilesToStorage(profiles, renderManageList);
          }
        });
      });
    });
  }

  // --- 5. 编辑表单逻辑 (加载与重置) ---
  function loadProfileToForm(profile) {
    inputId.value = profile.id;
    document.getElementById('p-name').value = profile.name;
    document.getElementById('p-scheme').value = profile.scheme;
    document.getElementById('p-host').value = profile.host;
    document.getElementById('p-port').value = profile.port;
    document.getElementById('p-user').value = profile.user || '';
    document.getElementById('p-pass').value = profile.pass || '';
    document.getElementById('p-bypass').value = (profile.bypassList || []).join(', ');

    // 切换UI为更新模式
    btnSave.textContent = '更新配置';
    btnSave.classList.add('update-mode');
    btnCancel.classList.remove('hidden');
    
    // 滚动到顶部方便编辑
    document.querySelector('.container').scrollTop = 0;
  }

  function resetForm() {
    proxyForm.reset();
    inputId.value = '';
    btnSave.textContent = '保存配置';
    btnSave.classList.remove('update-mode');
    btnCancel.classList.add('hidden');
    // 恢复默认排除列表
    document.getElementById('p-bypass').value = "localhost, 127.0.0.1, <local>";
  }

  btnCancel.addEventListener('click', resetForm);

  // 表单提交 (新增或更新)
  proxyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = inputId.value || Date.now().toString(); 
    
    const newProfile = {
      id: id,
      name: document.getElementById('p-name').value,
      scheme: document.getElementById('p-scheme').value,
      host: document.getElementById('p-host').value,
      port: parseInt(document.getElementById('p-port').value),
      user: document.getElementById('p-user').value,
      pass: document.getElementById('p-pass').value,
      auth: !!document.getElementById('p-user').value,
      bypassList: document.getElementById('p-bypass').value.split(',').map(s => s.trim()).filter(s => s)
    };

    getProfiles((profiles) => {
      if (inputId.value) {
        // 编辑模式：替换旧数据
        const index = profiles.findIndex(p => p.id === inputId.value);
        if (index !== -1) profiles[index] = newProfile;
      } else {
        // 新增模式：追加数据
        profiles.push(newProfile);
      }
      saveProfilesToStorage(profiles, () => {
        resetForm();
        renderManageList();
        // 如果修改的是当前正在使用的代理，刷新主页显示
        renderProxyList(); 
        alert(inputId.value ? '配置更新成功' : '配置保存成功');
      });
    });
  });

  // --- 6. 代理应用与状态更新 (与 Background 通信) ---
  function updateStatusUI(config) {
    const directBtn = document.querySelector('.mode-btn.direct');
    const systemBtn = document.querySelector('.mode-btn.system');
    directBtn.classList.remove('active');
    systemBtn.classList.remove('active');

    if (config.mode === 'direct') {
      currentStatusSpan.textContent = '直连模式';
      currentStatusSpan.className = 'badge';
      currentStatusSpan.style.color = '#5f6368';
      currentDetailP.textContent = '未使用代理';
      directBtn.classList.add('active');
    } else if (config.mode === 'system') {
      currentStatusSpan.textContent = '系统代理';
      currentStatusSpan.style.color = '#5f6368';
      currentDetailP.textContent = '遵循操作系统设置';
      systemBtn.classList.add('active');
    } else if (config.mode === 'fixed_servers') {
      currentStatusSpan.textContent = config.name || '自定义代理';
      currentStatusSpan.style.color = '#1a73e8';
      currentDetailP.textContent = `${config.rules.singleProxy.scheme}://${config.rules.singleProxy.host}:${config.rules.singleProxy.port}`;
    }
  }

  function applyProxy(profile) {
    chrome.runtime.sendMessage({ type: 'SET_PROXY', profile: profile }, () => {
      renderProxyList();
      // 代理切换后，延迟检测IP
      setTimeout(checkCurrentIP, 500); 
    });
  }

  document.querySelector('.mode-btn.direct').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'SET_DIRECT' }, () => {
      renderProxyList();
      checkCurrentIP();
    });
  });
  
  document.querySelector('.mode-btn.system').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'SET_SYSTEM' }, () => {
      renderProxyList();
      checkCurrentIP();
    });
  });

  // --- 7. IP 检测功能 (修复版：使用 ipwho.is) ---
  btnRefreshIp.addEventListener('click', checkCurrentIP);

  function checkCurrentIP() {
    ipAddressSpan.textContent = '检测中...';
    ipCountrySpan.textContent = '';
    ipIndicator.className = '';
    
    // 设置超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    // 使用 ipwho.is (对机房IP更友好，不易返回403)
    fetch('https://ipwho.is/', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        clearTimeout(timeoutId);

        // 检查 API 返回状态
        if (!data.success) {
            throw new Error(data.message || 'API Error');
        }
        
        // 1. 显示 IP
        ipAddressSpan.textContent = data.ip;
        
        // 2. 显示地区 (国旗 + 国家名)
        const flag = getFlagEmoji(data.country_code); 
        const countryName = data.country || data.country_code;
        
        ipCountrySpan.textContent = `${flag} ${countryName}`;
        
        // 3. 鼠标悬停显示详细城市/区域
        const city = data.city || '';
        const region = data.region || '';
        const details = [city, region].filter(Boolean).join(', ');
        ipCountrySpan.title = details || countryName;

        ipIndicator.classList.add('online');
      })
      .catch(err => {
        clearTimeout(timeoutId);
        console.error("GeoIP Error:", err);
        
        // --- 降级方案 ---
        // 回退到 ipify 仅显示 IP
        fetch('https://api.ipify.org?format=json')
          .then(res => res.json())
          .then(data => {
             ipAddressSpan.textContent = data.ip;
             ipCountrySpan.textContent = ''; // 既然未知就不显示错误信息，留空更整洁
             ipIndicator.classList.add('online');
          })
          .catch(() => {
             ipAddressSpan.textContent = '检测失败';
             ipIndicator.classList.remove('online');
          });
      });
  }

  // 辅助函数：将国家代码 (如 SG) 转换为 Emoji (🇸🇬)
  function getFlagEmoji(countryCode) {
    if (!countryCode) return '';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char =>  127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  }

  // --- 8. 导入导出功能 ---
  btnExport.addEventListener('click', () => {
    getProfiles((profiles) => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profiles, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "proxy_config_" + new Date().toISOString().slice(0,10) + ".json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    });
  });

  btnImport.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedProfiles = JSON.parse(event.target.result);
        if (!Array.isArray(importedProfiles)) throw new Error("格式错误");
        
        const validProfiles = importedProfiles.filter(p => p.host && p.port);
        if (validProfiles.length === 0) {
          alert("没有找到有效的代理配置");
          return;
        }

        if (confirm(`发现 ${validProfiles.length} 个配置。点击【确定】覆盖当前列表，点击【取消】则追加到末尾。`)) {
          saveProfilesToStorage(validProfiles, () => {
            alert('导入成功 (已覆盖)');
            renderManageList();
          });
        } else {
          getProfiles((curr) => {
            // 重新生成ID避免冲突
            const newOnes = validProfiles.map(p => ({...p, id: Date.now() + Math.random().toString()}));
            saveProfilesToStorage(curr.concat(newOnes), () => {
              alert('导入成功 (已追加)');
              renderManageList();
            });
          });
        }
      } catch (err) {
        alert("导入失败: JSON 格式错误");
      }
      fileInput.value = ''; // 允许重复导入同一文件
    };
    reader.readAsText(file);
  });

  // --- 初始化执行 ---
  renderProxyList();
  checkCurrentIP(); // 打开时自动检测一次
});