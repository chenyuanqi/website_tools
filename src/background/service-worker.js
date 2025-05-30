/**
 * 网页工具扩展 Service Worker
 * 处理扩展的后台逻辑和跨标签页通信
 */

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[网页工具] 扩展已安装/更新:', details.reason);
  
  // 初始化默认设置
  await initializeSettings();
  
  // 创建右键菜单
  createContextMenus();
  
  // 显示欢迎通知
  if (details.reason === 'install') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icons/icon48.png',
      title: '元气助手',
      message: '扩展安装成功！点击工具栏图标开始使用。'
    });
  }
});

/**
 * 初始化默认设置
 */
async function initializeSettings() {
  try {
    const result = await chrome.storage.sync.get(['websiteToolsSettings']);
    
    if (!result.websiteToolsSettings) {
      const defaultSettings = {
        linkManager: {
          enabled: true,
          newTabForExternal: true,
          popupPreview: false,
          customRules: []
        },
        copyFreedom: {
          enabled: true,
          textSelection: true,
          rightClickMenu: true,
          keyboardShortcuts: true
        },
        mediaExtractor: {
          enabled: true,
          autoDetectImages: true,
          autoDetectVideos: false,
          autoDetectAudio: false
        }
      };
      
      await chrome.storage.sync.set({ websiteToolsSettings: defaultSettings });
      console.log('[网页工具] 默认设置已初始化');
    }
  } catch (error) {
    console.error('[网页工具] 初始化设置失败:', error);
  }
}

/**
 * 创建右键菜单
 */
function createContextMenus() {
  // 清除现有菜单
  chrome.contextMenus.removeAll(() => {
    // 主菜单
    chrome.contextMenus.create({
      id: 'websiteTools',
      title: '网页工具箱',
      contexts: ['page', 'selection', 'link', 'image']
    });
    
    // 复制限制解除
    chrome.contextMenus.create({
      id: 'enableTextSelection',
      parentId: 'websiteTools',
      title: '解除复制限制',
      contexts: ['page', 'selection']
    });
    
    // 链接相关
    chrome.contextMenus.create({
      id: 'openInNewTab',
      parentId: 'websiteTools',
      title: '在新标签页打开',
      contexts: ['link']
    });
    
    chrome.contextMenus.create({
      id: 'previewLink',
      parentId: 'websiteTools',
      title: '预览链接',
      contexts: ['link']
    });
    
    // 媒体提取
    chrome.contextMenus.create({
      id: 'extractImages',
      parentId: 'websiteTools',
      title: '提取页面图片',
      contexts: ['page']
    });
    
    chrome.contextMenus.create({
      id: 'downloadImage',
      parentId: 'websiteTools',
      title: '下载图片',
      contexts: ['image']
    });
    
    // 分隔线
    chrome.contextMenus.create({
      id: 'separator',
      parentId: 'websiteTools',
      type: 'separator',
      contexts: ['page']
    });
    
    // 打开侧边栏
    chrome.contextMenus.create({
      id: 'openSidePanel',
      parentId: 'websiteTools',
      title: '打开工具面板',
      contexts: ['page']
    });
  });
}

/**
 * 处理右键菜单点击
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('[网页工具] 右键菜单点击:', info.menuItemId);
  
  try {
    switch (info.menuItemId) {
      case 'enableTextSelection':
        await handleEnableTextSelection(tab);
        break;
        
      case 'openInNewTab':
        if (info.linkUrl) {
          chrome.tabs.create({ url: info.linkUrl });
          chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('assets/icons/icon128.png'),
            title: '元气助手',
            message: `${info.linkUrl.split('/').pop() || '页面链接'} 已在新标签页打开`
          });
        }
        break;
        
      case 'previewLink':
        await handlePreviewLink(tab, info.linkUrl);
        break;
        
      case 'extractImages':
        await handleExtractImages(tab);
        break;
        
      case 'downloadImage':
        if (info.srcUrl) {
          chrome.downloads.download({ url: info.srcUrl });
        }
        break;
        
      case 'openSidePanel':
        await chrome.sidePanel.open({ tabId: tab.id });
        break;
    }
  } catch (error) {
    console.error('[网页工具] 处理右键菜单失败:', error);
  }
});

/**
 * 处理启用文本选择
 */
async function handleEnableTextSelection(tab) {
  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'ENABLE_TEXT_SELECTION',
      data: { enabled: true }
    });
    
    // 显示成功通知
    const domain = new URL(tab.url).hostname;
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icons/icon128.png'),
      title: '元气助手',
      message: `在 ${domain} 上启用了复制自由功能`
    });
  } catch (error) {
    console.error('[网页工具] 启用文本选择失败:', error);
  }
}

/**
 * 处理预览链接
 */
async function handlePreviewLink(tab, linkUrl) {
  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_LINK_PREVIEW',
      data: { url: linkUrl }
    });
  } catch (error) {
    console.error('[网页工具] 预览链接失败:', error);
  }
}

/**
 * 处理提取图片
 */
async function handleExtractImages(tab) {
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'EXTRACT_IMAGES'
    });
    
    if (response && response.images) {
      console.log('[网页工具] 提取到图片:', response.images.length, '张');
      
      // 打开侧边栏显示结果
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  } catch (error) {
    console.error('[网页工具] 提取图片失败:', error);
  }
}

/**
 * 处理来自Content Script的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[网页工具] 收到消息:', request.type);
  
  handleMessage(request, sender, sendResponse);
  return true; // 保持消息通道开放
});

/**
 * 处理消息
 */
async function handleMessage(request, sender, sendResponse) {
  try {
    const { type, data } = request;
    
    switch (type) {
      case 'GET_SETTINGS':
        const settings = await getSettings();
        sendResponse({ success: true, data: settings });
        break;
        
      case 'UPDATE_SETTINGS':
        await updateSettings(data);
        sendResponse({ success: true });
        break;
        
      case 'SHOW_NOTIFICATION':
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('assets/icons/icon128.png'),
          title: data.title || '元气助手',
          message: data.message
        });
        sendResponse({ success: true });
        break;
        
      case 'OPEN_SIDE_PANEL':
        if (sender.tab) {
          await chrome.sidePanel.open({ tabId: sender.tab.id });
        }
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: '未知的消息类型' });
    }
  } catch (error) {
    console.error('[网页工具] 处理消息失败:', error);
    sendResponse({ error: error.message });
  }
}

/**
 * 获取设置
 */
async function getSettings() {
  try {
    const result = await chrome.storage.sync.get(['websiteToolsSettings']);
    return result.websiteToolsSettings || {};
  } catch (error) {
    console.error('[网页工具] 获取设置失败:', error);
    return {};
  }
}

/**
 * 更新设置
 */
async function updateSettings(newSettings) {
  try {
    await chrome.storage.sync.set({ websiteToolsSettings: newSettings });
    console.log('[网页工具] 设置已更新');
  } catch (error) {
    console.error('[网页工具] 更新设置失败:', error);
    throw error;
  }
}

/**
 * 处理标签页更新
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 当页面加载完成时，可以进行一些初始化操作
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('[网页工具] 页面加载完成:', tab.url);
  }
});

/**
 * 处理扩展图标点击（如果没有popup）
 */
chrome.action.onClicked.addListener(async (tab) => {
  // 如果没有设置popup，点击图标时打开侧边栏
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (error) {
    console.error('[网页工具] 打开侧边栏失败:', error);
  }
});

console.log('[网页工具] Service Worker 已启动'); 