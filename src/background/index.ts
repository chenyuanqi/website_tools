/**
 * Background Service Worker
 * 基于推荐的工程化设计实现，支持SuperCopy风格的白名单管理
 */

import { MessageHandler, MessageTypes, sendToContent } from '@shared/messaging';

class BackgroundService extends MessageHandler {
  private downloadQueue = new Map<string, any>();
  private tabStates = new Map<number, any>();

  constructor() {
    super();
    this.init();
  }

  private init(): void {
    console.log('[Background] Service Worker 启动');
    
    // 注册消息处理器
    this.registerMessageHandlers();
    
    // 创建右键菜单
    this.createContextMenus();
    
    // 监听扩展安装/更新
    this.setupInstallListener();
    
    // 监听标签页事件
    this.setupTabListeners();
    
    // 监听下载事件
    this.setupDownloadListeners();
    
    // 监听扩展图标点击 - SuperCopy风格的开关逻辑
    this.setupActionClickListener();
    
    // 设置扩展图标状态
    this.updateBadgeText();
  }

  private registerMessageHandlers(): void {
    // 下载相关
    this.registerHandler(MessageTypes.DOWNLOAD_ASSET, this.handleDownloadAsset.bind(this));
    
    // 统计相关
    this.registerHandler(MessageTypes.SELECTION_UNLOCK_ENABLED, this.handleSelectionUnlockEnabled.bind(this));
    this.registerHandler(MessageTypes.IMAGES_COLLECTED, this.handleImagesCollected.bind(this));
    this.registerHandler(MessageTypes.CONTENT_SCRIPT_READY, this.handleContentScriptReady.bind(this));
    
    // 设置相关
    this.registerHandler(MessageTypes.GET_SETTINGS, this.handleGetSettings.bind(this));
    this.registerHandler(MessageTypes.UPDATE_SETTINGS, this.handleUpdateSettings.bind(this));
    
    // 白名单管理
    this.registerHandler('GET_COPY_FREEDOM_WHITELIST', this.handleGetWhitelist.bind(this));
    this.registerHandler('REMOVE_FROM_WHITELIST', this.handleRemoveFromWhitelist.bind(this));
    this.registerHandler('CLEAR_WHITELIST', this.handleClearWhitelist.bind(this));
  }

  /**
   * 设置扩展图标点击监听器 - SuperCopy风格
   */
  private setupActionClickListener(): void {
    chrome.action.onClicked.addListener(async (tab) => {
      if (!tab.id || !tab.url) return;
      
      try {
        const host = new URL(tab.url).hostname;
        
        // 检查当前是否在白名单中
        const result = await chrome.storage.local.get(['copyFreedomWhitelist']);
        const whitelist = result.copyFreedomWhitelist || [];
        const isInWhitelist = whitelist.includes(host);
        
        if (isInWhitelist) {
          // 已在白名单，移除并禁用
          await this.removeFromWhitelist(host);
          await sendToContent(tab.id, { type: MessageTypes.DISABLE_TEXT_SELECTION });
          this.updateBadgeForHost(tab.id, host, false);
          this.showNotification(`已禁用复制自由: ${host}`);
        } else {
          // 不在白名单，添加并启用
          await this.addToWhitelist(host);
          await sendToContent(tab.id, { type: MessageTypes.ENABLE_TEXT_SELECTION });
          this.updateBadgeForHost(tab.id, host, true);
          this.showNotification(`已启用复制自由: ${host}`);
        }
      } catch (error) {
        console.error('[Background] 处理图标点击失败:', error);
        this.showNotification('操作失败，请重试', 'error');
      }
    });
  }

  private createContextMenus(): void {
    // 清除现有菜单
    chrome.contextMenus.removeAll(() => {
      // 主菜单
      chrome.contextMenus.create({
        id: 'yuanqi-main',
        title: '元气助手',
        contexts: ['page', 'selection', 'link', 'image']
      });
      
      // 复制自由子菜单
      chrome.contextMenus.create({
        id: 'yuanqi-copy-freedom',
        parentId: 'yuanqi-main',
        title: '解除复制限制',
        contexts: ['page', 'selection']
      });
      
      chrome.contextMenus.create({
        id: 'yuanqi-violent-mode',
        parentId: 'yuanqi-main',
        title: '强力模式 (终极解锁)',
        contexts: ['page', 'selection']
      });
      
      chrome.contextMenus.create({
        id: 'yuanqi-whitelist-manage',
        parentId: 'yuanqi-main',
        title: '管理白名单',
        contexts: ['page']
      });
      
      // 链接管理子菜单
      chrome.contextMenus.create({
        id: 'yuanqi-link-new-tab',
        parentId: 'yuanqi-main',
        title: '在新标签页打开',
        contexts: ['link']
      });
      
      chrome.contextMenus.create({
        id: 'yuanqi-link-preview',
        parentId: 'yuanqi-main',
        title: '预览链接',
        contexts: ['link']
      });
      
      // 媒体提取子菜单
      chrome.contextMenus.create({
        id: 'yuanqi-extract-images',
        parentId: 'yuanqi-main',
        title: '提取页面图片',
        contexts: ['page', 'image']
      });
      
      chrome.contextMenus.create({
        id: 'yuanqi-extract-videos',
        parentId: 'yuanqi-main',
        title: '检测页面视频',
        contexts: ['page']
      });
      
      chrome.contextMenus.create({
        id: 'yuanqi-download-image',
        parentId: 'yuanqi-main',
        title: '下载图片',
        contexts: ['image']
      });
      
      // 分隔线
      chrome.contextMenus.create({
        id: 'yuanqi-separator',
        parentId: 'yuanqi-main',
        type: 'separator',
        contexts: ['page']
      });
      
      // 设置菜单
      chrome.contextMenus.create({
        id: 'yuanqi-settings',
        parentId: 'yuanqi-main',
        title: '扩展设置',
        contexts: ['page']
      });
    });
    
    // 监听菜单点击
    chrome.contextMenus.onClicked.addListener(this.handleContextMenuClick.bind(this));
  }

  private async handleContextMenuClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): Promise<void> {
    if (!tab?.id) return;
    
    try {
      switch (info.menuItemId) {
        case 'yuanqi-copy-freedom':
          await sendToContent(tab.id, { type: MessageTypes.ENABLE_TEXT_SELECTION });
          if (tab.url) {
            const host = new URL(tab.url).hostname;
            await this.addToWhitelist(host);
            this.updateBadgeForHost(tab.id, host, true);
          }
          this.showNotification('复制限制已解除');
          break;
          
        case 'yuanqi-violent-mode':
          await sendToContent(tab.id, { type: 'ENABLE_VIOLENT_MODE' });
          this.showNotification('强力模式已启用 - 终极解锁');
          break;
          
        case 'yuanqi-whitelist-manage':
          chrome.runtime.openOptionsPage();
          break;
          
        case 'yuanqi-link-new-tab':
          if (info.linkUrl) {
            chrome.tabs.create({ url: info.linkUrl });
          }
          break;
          
        case 'yuanqi-link-preview':
          // 打开侧边栏显示预览
          chrome.sidePanel.open({ tabId: tab.id });
          break;
          
        case 'yuanqi-extract-images':
          await sendToContent(tab.id, { type: MessageTypes.EXTRACT_IMAGES });
          chrome.sidePanel.open({ tabId: tab.id });
          break;
          
        case 'yuanqi-extract-videos':
          await sendToContent(tab.id, { type: MessageTypes.EXTRACT_VIDEOS });
          chrome.sidePanel.open({ tabId: tab.id });
          break;
          
        case 'yuanqi-download-image':
          if (info.srcUrl) {
            this.downloadFile(info.srcUrl);
          }
          break;
          
        case 'yuanqi-settings':
          chrome.runtime.openOptionsPage();
          break;
      }
    } catch (error) {
      console.error('[Background] 处理右键菜单失败:', error);
    }
  }

  private setupInstallListener(): void {
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('[Background] 扩展已安装/更新:', details.reason);
      
      if (details.reason === 'install') {
        // 首次安装
        this.showWelcomeNotification();
        this.initializeDefaultSettings();
      } else if (details.reason === 'update') {
        // 更新
        this.handleExtensionUpdate(details.previousVersion);
      }
    });
  }

  private setupTabListeners(): void {
    // 标签页激活
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (tab.url) {
        const host = new URL(tab.url).hostname;
        const isInWhitelist = await this.isHostInWhitelist(host);
        this.updateBadgeForHost(activeInfo.tabId, host, isInWhitelist);
      }
    });
    
    // 标签页更新
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        const host = new URL(tab.url).hostname;
        const isInWhitelist = await this.isHostInWhitelist(host);
        this.updateBadgeForHost(tabId, host, isInWhitelist);
        this.updateTabState(tabId, tab);
      }
    });
    
    // 标签页移除
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.tabStates.delete(tabId);
    });
  }

  private setupDownloadListeners(): void {
    // 监听下载状态
    chrome.downloads.onChanged.addListener((downloadDelta) => {
      const queueItem = this.downloadQueue.get(downloadDelta.id.toString());
      if (queueItem) {
        if (downloadDelta.state?.current === 'complete') {
          this.showNotification(`下载完成: ${queueItem.filename}`);
          this.downloadQueue.delete(downloadDelta.id.toString());
        } else if (downloadDelta.state?.current === 'interrupted') {
          this.showNotification(`下载失败: ${queueItem.filename}`, 'error');
          this.downloadQueue.delete(downloadDelta.id.toString());
        }
      }
    });
  }

  // 白名单管理方法
  private async addToWhitelist(host: string): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['copyFreedomWhitelist']);
      const whitelist = result.copyFreedomWhitelist || [];
      
      if (!whitelist.includes(host)) {
        whitelist.push(host);
        await chrome.storage.local.set({ copyFreedomWhitelist: whitelist });
        console.log('[Background] 已添加到白名单:', host);
      }
    } catch (error) {
      console.warn('[Background] 添加白名单失败:', error);
    }
  }

  private async removeFromWhitelist(host: string): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['copyFreedomWhitelist']);
      const whitelist = result.copyFreedomWhitelist || [];
      
      const index = whitelist.indexOf(host);
      if (index > -1) {
        whitelist.splice(index, 1);
        await chrome.storage.local.set({ copyFreedomWhitelist: whitelist });
        console.log('[Background] 已从白名单移除:', host);
      }
    } catch (error) {
      console.warn('[Background] 移除白名单失败:', error);
    }
  }

  private async isHostInWhitelist(host: string): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(['copyFreedomWhitelist']);
      const whitelist = result.copyFreedomWhitelist || [];
      return whitelist.includes(host);
    } catch (error) {
      console.warn('[Background] 检查白名单失败:', error);
      return false;
    }
  }

  // 消息处理器
  private async handleDownloadAsset(request: any): Promise<any> {
    const { url, filename } = request.data;
    return this.downloadFile(url, filename);
  }

  private async handleSelectionUnlockEnabled(request: any): Promise<any> {
    const { url, host } = request.data;
    console.log('[Background] 文本选择解锁已启用:', host);
    
    // 更新统计
    this.updateUsageStats('copyFreedom');
    
    // 更新徽章状态
    const tabs = await chrome.tabs.query({ url: `*://${host}/*` });
    tabs.forEach(tab => {
      if (tab.id) {
        this.updateBadgeForHost(tab.id, host, true);
      }
    });
    
    return { success: true };
  }

  private async handleImagesCollected(request: any): Promise<any> {
    const { count, url } = request.data;
    console.log(`[Background] 已收集 ${count} 张图片:`, url);
    
    // 更新徽章
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
    
    return { success: true };
  }

  private async handleContentScriptReady(request: any): Promise<any> {
    const { url, timestamp } = request.data;
    console.log('[Background] Content Script 就绪:', url);
    
    return { success: true };
  }

  private async handleGetSettings(): Promise<any> {
    const result = await chrome.storage.sync.get(['websiteToolsSettings']);
    return {
      success: true,
      data: result.websiteToolsSettings || this.getDefaultSettings()
    };
  }

  private async handleUpdateSettings(request: any): Promise<any> {
    const { settings } = request.data;
    await chrome.storage.sync.set({ websiteToolsSettings: settings });
    
    // 广播设置更新给所有标签页
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      if (tab.id) {
        sendToContent(tab.id, {
          type: MessageTypes.UPDATE_SETTINGS,
          data: { settings }
        }).catch(() => {
          // 忽略发送失败的标签页
        });
      }
    });
    
    return { success: true };
  }

  private async handleGetWhitelist(): Promise<any> {
    try {
      const result = await chrome.storage.local.get(['copyFreedomWhitelist']);
      return {
        success: true,
        data: result.copyFreedomWhitelist || []
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private async handleRemoveFromWhitelist(request: any): Promise<any> {
    const { host } = request.data;
    await this.removeFromWhitelist(host);
    
    // 更新相关标签页的徽章
    const tabs = await chrome.tabs.query({ url: `*://${host}/*` });
    tabs.forEach(tab => {
      if (tab.id) {
        this.updateBadgeForHost(tab.id, host, false);
      }
    });
    
    return { success: true };
  }

  private async handleClearWhitelist(): Promise<any> {
    try {
      await chrome.storage.local.set({ copyFreedomWhitelist: [] });
      
      // 更新所有标签页的徽章
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        if (tab.id && tab.url) {
          const host = new URL(tab.url).hostname;
          this.updateBadgeForHost(tab.id, host, false);
        }
      });
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  // 工具方法
  private async downloadFile(url: string, filename?: string): Promise<any> {
    try {
      const downloadId = await chrome.downloads.download({
        url: url,
        filename: filename || this.generateFilename(url)
      });
      
      this.downloadQueue.set(downloadId.toString(), {
        url,
        filename: filename || this.generateFilename(url),
        timestamp: Date.now()
      });
      
      return { success: true, downloadId };
    } catch (error) {
      console.error('[Background] 下载失败:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private generateFilename(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || 'download';
      
      // 如果没有扩展名，尝试从URL推断
      if (!filename.includes('.')) {
        const contentType = this.guessContentType(url);
        return `${filename}.${contentType}`;
      }
      
      return filename;
    } catch {
      return `download_${Date.now()}`;
    }
  }

  private guessContentType(url: string): string {
    if (url.includes('image') || /\.(jpg|jpeg|png|gif|webp)/.test(url)) {
      return 'jpg';
    } else if (url.includes('video') || /\.(mp4|webm|avi)/.test(url)) {
      return 'mp4';
    } else if (url.includes('audio') || /\.(mp3|wav|ogg)/.test(url)) {
      return 'mp3';
    }
    return 'bin';
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icons/icon48.png',
      title: '元气助手',
      message: message
    });
  }

  private showWelcomeNotification(): void {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icons/icon48.png',
      title: '欢迎使用元气助手！',
      message: '点击扩展图标即可快速启用/禁用复制自由功能。'
    });
  }

  private async initializeDefaultSettings(): Promise<void> {
    const defaultSettings = this.getDefaultSettings();
    await chrome.storage.sync.set({ websiteToolsSettings: defaultSettings });
    
    // 初始化空白名单
    await chrome.storage.local.set({ copyFreedomWhitelist: [] });
  }

  private getDefaultSettings(): any {
    return {
      copyFreedom: {
        enabled: true,
        textSelection: true,
        rightClickMenu: true,
        keyboardShortcuts: true
      },
      linkManager: {
        enabled: true,
        newTabForExternal: true,
        popupPreview: false,
        customRules: []
      },
      mediaExtractor: {
        enabled: true,
        autoDetectImages: true,
        autoDetectVideos: false,
        autoDetectAudio: false,
        minImageSize: 100,
        supportedFormats: ['jpg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mp3', 'wav']
      }
    };
  }

  private async handleExtensionUpdate(previousVersion?: string): Promise<void> {
    console.log(`[Background] 扩展从 ${previousVersion} 更新到当前版本`);
    
    // 这里可以处理版本迁移逻辑
    if (previousVersion) {
      // 版本特定的迁移逻辑
    }
  }

  private async updateBadgeText(): Promise<void> {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
  }

  /**
   * 更新特定主机的徽章状态 - SuperCopy风格
   */
  private updateBadgeForHost(tabId: number, host: string, isEnabled: boolean): void {
    if (this.isSpecialPage(`https://${host}`)) {
      // 特殊页面
      chrome.action.setBadgeText({ text: '!', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId });
      chrome.action.setTitle({ 
        title: '元气助手 - 当前页面不支持扩展功能', 
        tabId 
      });
    } else if (isEnabled) {
      // 已启用 - 彩色徽章
      chrome.action.setBadgeText({ text: '✓', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId });
      chrome.action.setTitle({ 
        title: `元气助手 - 复制自由已启用 (${host})`, 
        tabId 
      });
    } else {
      // 未启用 - 灰色徽章
      chrome.action.setBadgeText({ text: '', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#6b7280', tabId });
      chrome.action.setTitle({ 
        title: `元气助手 - 点击启用复制自由 (${host})`, 
        tabId 
      });
    }
  }

  private updateTabState(tabId: number, tab: chrome.tabs.Tab): void {
    this.tabStates.set(tabId, {
      url: tab.url,
      title: tab.title,
      timestamp: Date.now()
    });
  }

  private isSpecialPage(url: string): boolean {
    const specialPagePrefixes = [
      'chrome://',
      'chrome-extension://',
      'moz-extension://',
      'edge://',
      'about:',
      'file://',
      'data:',
      'javascript:'
    ];
    
    return specialPagePrefixes.some(prefix => url.startsWith(prefix));
  }

  private async updateUsageStats(feature: string): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['usageStats']);
      const stats = result.usageStats || {};
      
      stats[feature] = (stats[feature] || 0) + 1;
      stats.lastUsed = Date.now();
      
      await chrome.storage.local.set({ usageStats: stats });
    } catch (error) {
      console.warn('[Background] 更新使用统计失败:', error);
    }
  }
}

// 初始化 Background Service
new BackgroundService(); 