(function() {
  "use strict";
  async function sendToContent(tabId, message) {
    return new Promise((resolve, reject) => {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now()
      };
      chrome.tabs.sendMessage(tabId, messageWithTimestamp, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response || { success: true });
        }
      });
    });
  }
  const MessageTypes = {
    // 复制自由相关
    ENABLE_TEXT_SELECTION: "ENABLE_TEXT_SELECTION",
    DISABLE_TEXT_SELECTION: "DISABLE_TEXT_SELECTION",
    TOGGLE_TEXT_SELECTION: "TOGGLE_TEXT_SELECTION",
    RESTORE_RIGHT_CLICK: "RESTORE_RIGHT_CLICK",
    RESTORE_SHORTCUTS: "RESTORE_SHORTCUTS",
    // 链接管理相关
    ENABLE_NEW_TAB_MODE: "ENABLE_NEW_TAB_MODE",
    ENABLE_PREVIEW_MODE: "ENABLE_PREVIEW_MODE",
    GET_LINK_STATS: "GET_LINK_STATS",
    // 媒体提取相关
    EXTRACT_IMAGES: "EXTRACT_IMAGES",
    EXTRACT_VIDEOS: "EXTRACT_VIDEOS",
    EXTRACT_AUDIO: "EXTRACT_AUDIO",
    GET_MEDIA_STATS: "GET_MEDIA_STATS",
    DOWNLOAD_ASSET: "DOWNLOAD_ASSET",
    // 设置相关
    UPDATE_SETTINGS: "UPDATE_SETTINGS",
    GET_SETTINGS: "GET_SETTINGS",
    // 通用
    GET_PAGE_INFO: "GET_PAGE_INFO",
    PING: "PING",
    // 通知事件
    SELECTION_UNLOCK_ENABLED: "SELECTION_UNLOCK_ENABLED",
    IMAGES_COLLECTED: "IMAGES_COLLECTED",
    CONTENT_SCRIPT_READY: "CONTENT_SCRIPT_READY"
  };
  class MessageHandler {
    constructor() {
      this.handlers = /* @__PURE__ */ new Map();
      this.setupMessageListener();
    }
    setupMessageListener() {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        const handler = this.handlers.get(request.type);
        if (handler) {
          try {
            const result = handler(request, sender);
            if (result instanceof Promise) {
              result.then(sendResponse).catch((error) => {
                sendResponse({ success: false, error: error.message });
              });
              return true;
            } else {
              sendResponse(result);
            }
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
        }
      });
    }
    registerHandler(type, handler) {
      this.handlers.set(type, handler);
    }
    unregisterHandler(type) {
      this.handlers.delete(type);
    }
    destroy() {
      this.handlers.clear();
    }
  }
  class BackgroundService extends MessageHandler {
    constructor() {
      super();
      this.downloadQueue = /* @__PURE__ */ new Map();
      this.tabStates = /* @__PURE__ */ new Map();
      this.init();
    }
    init() {
      console.log("[Background] Service Worker 启动");
      this.registerMessageHandlers();
      this.createContextMenus();
      this.setupInstallListener();
      this.setupTabListeners();
      this.setupDownloadListeners();
      this.setupActionClickListener();
      this.updateBadgeText();
    }
    registerMessageHandlers() {
      this.registerHandler(MessageTypes.DOWNLOAD_ASSET, this.handleDownloadAsset.bind(this));
      this.registerHandler(MessageTypes.SELECTION_UNLOCK_ENABLED, this.handleSelectionUnlockEnabled.bind(this));
      this.registerHandler(MessageTypes.IMAGES_COLLECTED, this.handleImagesCollected.bind(this));
      this.registerHandler(MessageTypes.CONTENT_SCRIPT_READY, this.handleContentScriptReady.bind(this));
      this.registerHandler(MessageTypes.GET_SETTINGS, this.handleGetSettings.bind(this));
      this.registerHandler(MessageTypes.UPDATE_SETTINGS, this.handleUpdateSettings.bind(this));
      this.registerHandler("GET_COPY_FREEDOM_WHITELIST", this.handleGetWhitelist.bind(this));
      this.registerHandler("REMOVE_FROM_WHITELIST", this.handleRemoveFromWhitelist.bind(this));
      this.registerHandler("CLEAR_WHITELIST", this.handleClearWhitelist.bind(this));
    }
    /**
     * 设置扩展图标点击监听器 - SuperCopy风格
     */
    setupActionClickListener() {
      chrome.action.onClicked.addListener(async (tab) => {
        if (!tab.id || !tab.url) return;
        try {
          const host = new URL(tab.url).hostname;
          const result = await chrome.storage.local.get(["copyFreedomWhitelist"]);
          const whitelist = result.copyFreedomWhitelist || [];
          const isInWhitelist = whitelist.includes(host);
          if (isInWhitelist) {
            await this.removeFromWhitelist(host);
            await sendToContent(tab.id, { type: MessageTypes.DISABLE_TEXT_SELECTION });
            this.updateBadgeForHost(tab.id, host, false);
            this.showNotification(`已禁用复制自由: ${host}`);
          } else {
            await this.addToWhitelist(host);
            await sendToContent(tab.id, { type: MessageTypes.ENABLE_TEXT_SELECTION });
            this.updateBadgeForHost(tab.id, host, true);
            this.showNotification(`已启用复制自由: ${host}`);
          }
        } catch (error) {
          console.error("[Background] 处理图标点击失败:", error);
          this.showNotification("操作失败，请重试", "error");
        }
      });
    }
    createContextMenus() {
      chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
          id: "yuanqi-main",
          title: "元气助手",
          contexts: ["page", "selection", "link", "image"]
        });
        chrome.contextMenus.create({
          id: "yuanqi-copy-freedom",
          parentId: "yuanqi-main",
          title: "解除复制限制",
          contexts: ["page", "selection"]
        });
        chrome.contextMenus.create({
          id: "yuanqi-violent-mode",
          parentId: "yuanqi-main",
          title: "强力模式 (终极解锁)",
          contexts: ["page", "selection"]
        });
        chrome.contextMenus.create({
          id: "yuanqi-whitelist-manage",
          parentId: "yuanqi-main",
          title: "管理白名单",
          contexts: ["page"]
        });
        chrome.contextMenus.create({
          id: "yuanqi-link-new-tab",
          parentId: "yuanqi-main",
          title: "在新标签页打开",
          contexts: ["link"]
        });
        chrome.contextMenus.create({
          id: "yuanqi-link-preview",
          parentId: "yuanqi-main",
          title: "预览链接",
          contexts: ["link"]
        });
        chrome.contextMenus.create({
          id: "yuanqi-extract-images",
          parentId: "yuanqi-main",
          title: "提取页面图片",
          contexts: ["page", "image"]
        });
        chrome.contextMenus.create({
          id: "yuanqi-extract-videos",
          parentId: "yuanqi-main",
          title: "检测页面视频",
          contexts: ["page"]
        });
        chrome.contextMenus.create({
          id: "yuanqi-download-image",
          parentId: "yuanqi-main",
          title: "下载图片",
          contexts: ["image"]
        });
        chrome.contextMenus.create({
          id: "yuanqi-separator",
          parentId: "yuanqi-main",
          type: "separator",
          contexts: ["page"]
        });
        chrome.contextMenus.create({
          id: "yuanqi-settings",
          parentId: "yuanqi-main",
          title: "扩展设置",
          contexts: ["page"]
        });
      });
      chrome.contextMenus.onClicked.addListener(this.handleContextMenuClick.bind(this));
    }
    async handleContextMenuClick(info, tab) {
      if (!tab?.id) return;
      try {
        switch (info.menuItemId) {
          case "yuanqi-copy-freedom":
            await sendToContent(tab.id, { type: MessageTypes.ENABLE_TEXT_SELECTION });
            if (tab.url) {
              const host = new URL(tab.url).hostname;
              await this.addToWhitelist(host);
              this.updateBadgeForHost(tab.id, host, true);
            }
            this.showNotification("复制限制已解除");
            break;
          case "yuanqi-violent-mode":
            await sendToContent(tab.id, { type: "ENABLE_VIOLENT_MODE" });
            this.showNotification("强力模式已启用 - 终极解锁");
            break;
          case "yuanqi-whitelist-manage":
            chrome.runtime.openOptionsPage();
            break;
          case "yuanqi-link-new-tab":
            if (info.linkUrl) {
              chrome.tabs.create({ url: info.linkUrl });
            }
            break;
          case "yuanqi-link-preview":
            chrome.sidePanel.open({ tabId: tab.id });
            break;
          case "yuanqi-extract-images":
            await sendToContent(tab.id, { type: MessageTypes.EXTRACT_IMAGES });
            chrome.sidePanel.open({ tabId: tab.id });
            break;
          case "yuanqi-extract-videos":
            await sendToContent(tab.id, { type: MessageTypes.EXTRACT_VIDEOS });
            chrome.sidePanel.open({ tabId: tab.id });
            break;
          case "yuanqi-download-image":
            if (info.srcUrl) {
              this.downloadFile(info.srcUrl);
            }
            break;
          case "yuanqi-settings":
            chrome.runtime.openOptionsPage();
            break;
        }
      } catch (error) {
        console.error("[Background] 处理右键菜单失败:", error);
      }
    }
    setupInstallListener() {
      chrome.runtime.onInstalled.addListener((details) => {
        console.log("[Background] 扩展已安装/更新:", details.reason);
        if (details.reason === "install") {
          this.showWelcomeNotification();
          this.initializeDefaultSettings();
        } else if (details.reason === "update") {
          this.handleExtensionUpdate(details.previousVersion);
        }
      });
    }
    setupTabListeners() {
      chrome.tabs.onActivated.addListener(async (activeInfo) => {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url) {
          const host = new URL(tab.url).hostname;
          const isInWhitelist = await this.isHostInWhitelist(host);
          this.updateBadgeForHost(activeInfo.tabId, host, isInWhitelist);
        }
      });
      chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
        if (changeInfo.status === "complete" && tab.url) {
          const host = new URL(tab.url).hostname;
          const isInWhitelist = await this.isHostInWhitelist(host);
          this.updateBadgeForHost(tabId, host, isInWhitelist);
          this.updateTabState(tabId, tab);
        }
      });
      chrome.tabs.onRemoved.addListener((tabId) => {
        this.tabStates.delete(tabId);
      });
    }
    setupDownloadListeners() {
      chrome.downloads.onChanged.addListener((downloadDelta) => {
        const queueItem = this.downloadQueue.get(downloadDelta.id.toString());
        if (queueItem) {
          if (downloadDelta.state?.current === "complete") {
            this.showNotification(`下载完成: ${queueItem.filename}`);
            this.downloadQueue.delete(downloadDelta.id.toString());
          } else if (downloadDelta.state?.current === "interrupted") {
            this.showNotification(`下载失败: ${queueItem.filename}`, "error");
            this.downloadQueue.delete(downloadDelta.id.toString());
          }
        }
      });
    }
    // 白名单管理方法
    async addToWhitelist(host) {
      try {
        const result = await chrome.storage.local.get(["copyFreedomWhitelist"]);
        const whitelist = result.copyFreedomWhitelist || [];
        if (!whitelist.includes(host)) {
          whitelist.push(host);
          await chrome.storage.local.set({ copyFreedomWhitelist: whitelist });
          console.log("[Background] 已添加到白名单:", host);
        }
      } catch (error) {
        console.warn("[Background] 添加白名单失败:", error);
      }
    }
    async removeFromWhitelist(host) {
      try {
        const result = await chrome.storage.local.get(["copyFreedomWhitelist"]);
        const whitelist = result.copyFreedomWhitelist || [];
        const index = whitelist.indexOf(host);
        if (index > -1) {
          whitelist.splice(index, 1);
          await chrome.storage.local.set({ copyFreedomWhitelist: whitelist });
          console.log("[Background] 已从白名单移除:", host);
        }
      } catch (error) {
        console.warn("[Background] 移除白名单失败:", error);
      }
    }
    async isHostInWhitelist(host) {
      try {
        const result = await chrome.storage.local.get(["copyFreedomWhitelist"]);
        const whitelist = result.copyFreedomWhitelist || [];
        return whitelist.includes(host);
      } catch (error) {
        console.warn("[Background] 检查白名单失败:", error);
        return false;
      }
    }
    // 消息处理器
    async handleDownloadAsset(request) {
      const { url, filename } = request.data;
      return this.downloadFile(url, filename);
    }
    async handleSelectionUnlockEnabled(request) {
      const { url, host } = request.data;
      console.log("[Background] 文本选择解锁已启用:", host);
      this.updateUsageStats("copyFreedom");
      const tabs = await chrome.tabs.query({ url: `*://${host}/*` });
      tabs.forEach((tab) => {
        if (tab.id) {
          this.updateBadgeForHost(tab.id, host, true);
        }
      });
      return { success: true };
    }
    async handleImagesCollected(request) {
      const { count, url } = request.data;
      console.log(`[Background] 已收集 ${count} 张图片:`, url);
      chrome.action.setBadgeText({ text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: "#4285f4" });
      return { success: true };
    }
    async handleContentScriptReady(request) {
      const { url, timestamp } = request.data;
      console.log("[Background] Content Script 就绪:", url);
      return { success: true };
    }
    async handleGetSettings() {
      const result = await chrome.storage.sync.get(["websiteToolsSettings"]);
      return {
        success: true,
        data: result.websiteToolsSettings || this.getDefaultSettings()
      };
    }
    async handleUpdateSettings(request) {
      const { settings } = request.data;
      await chrome.storage.sync.set({ websiteToolsSettings: settings });
      const tabs = await chrome.tabs.query({});
      tabs.forEach((tab) => {
        if (tab.id) {
          sendToContent(tab.id, {
            type: MessageTypes.UPDATE_SETTINGS,
            data: { settings }
          }).catch(() => {
          });
        }
      });
      return { success: true };
    }
    async handleGetWhitelist() {
      try {
        const result = await chrome.storage.local.get(["copyFreedomWhitelist"]);
        return {
          success: true,
          data: result.copyFreedomWhitelist || []
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
    async handleRemoveFromWhitelist(request) {
      const { host } = request.data;
      await this.removeFromWhitelist(host);
      const tabs = await chrome.tabs.query({ url: `*://${host}/*` });
      tabs.forEach((tab) => {
        if (tab.id) {
          this.updateBadgeForHost(tab.id, host, false);
        }
      });
      return { success: true };
    }
    async handleClearWhitelist() {
      try {
        await chrome.storage.local.set({ copyFreedomWhitelist: [] });
        const tabs = await chrome.tabs.query({});
        tabs.forEach((tab) => {
          if (tab.id && tab.url) {
            const host = new URL(tab.url).hostname;
            this.updateBadgeForHost(tab.id, host, false);
          }
        });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
    // 工具方法
    async downloadFile(url, filename) {
      try {
        const downloadId = await chrome.downloads.download({
          url,
          filename: filename || this.generateFilename(url)
        });
        this.downloadQueue.set(downloadId.toString(), {
          url,
          filename: filename || this.generateFilename(url),
          timestamp: Date.now()
        });
        return { success: true, downloadId };
      } catch (error) {
        console.error("[Background] 下载失败:", error);
        return { success: false, error: error.message };
      }
    }
    generateFilename(url) {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const filename = pathname.split("/").pop() || "download";
        if (!filename.includes(".")) {
          const contentType = this.guessContentType(url);
          return `${filename}.${contentType}`;
        }
        return filename;
      } catch {
        return `download_${Date.now()}`;
      }
    }
    guessContentType(url) {
      if (url.includes("image") || /\.(jpg|jpeg|png|gif|webp)/.test(url)) {
        return "jpg";
      } else if (url.includes("video") || /\.(mp4|webm|avi)/.test(url)) {
        return "mp4";
      } else if (url.includes("audio") || /\.(mp3|wav|ogg)/.test(url)) {
        return "mp3";
      }
      return "bin";
    }
    showNotification(message, type = "success") {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "assets/icons/icon48.png",
        title: "元气助手",
        message
      });
    }
    showWelcomeNotification() {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "assets/icons/icon48.png",
        title: "欢迎使用元气助手！",
        message: "点击扩展图标即可快速启用/禁用复制自由功能。"
      });
    }
    async initializeDefaultSettings() {
      const defaultSettings = this.getDefaultSettings();
      await chrome.storage.sync.set({ websiteToolsSettings: defaultSettings });
      await chrome.storage.local.set({ copyFreedomWhitelist: [] });
    }
    getDefaultSettings() {
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
          supportedFormats: ["jpg", "png", "gif", "webp", "mp4", "webm", "mp3", "wav"]
        }
      };
    }
    async handleExtensionUpdate(previousVersion) {
      console.log(`[Background] 扩展从 ${previousVersion} 更新到当前版本`);
    }
    async updateBadgeText() {
      chrome.action.setBadgeText({ text: "" });
      chrome.action.setBadgeBackgroundColor({ color: "#4285f4" });
    }
    /**
     * 更新特定主机的徽章状态 - SuperCopy风格
     */
    updateBadgeForHost(tabId, host, isEnabled) {
      if (this.isSpecialPage(`https://${host}`)) {
        chrome.action.setBadgeText({ text: "!", tabId });
        chrome.action.setBadgeBackgroundColor({ color: "#f59e0b", tabId });
        chrome.action.setTitle({
          title: "元气助手 - 当前页面不支持扩展功能",
          tabId
        });
      } else if (isEnabled) {
        chrome.action.setBadgeText({ text: "✓", tabId });
        chrome.action.setBadgeBackgroundColor({ color: "#10b981", tabId });
        chrome.action.setTitle({
          title: `元气助手 - 复制自由已启用 (${host})`,
          tabId
        });
      } else {
        chrome.action.setBadgeText({ text: "", tabId });
        chrome.action.setBadgeBackgroundColor({ color: "#6b7280", tabId });
        chrome.action.setTitle({
          title: `元气助手 - 点击启用复制自由 (${host})`,
          tabId
        });
      }
    }
    updateTabState(tabId, tab) {
      this.tabStates.set(tabId, {
        url: tab.url,
        title: tab.title,
        timestamp: Date.now()
      });
    }
    isSpecialPage(url) {
      const specialPagePrefixes = [
        "chrome://",
        "chrome-extension://",
        "moz-extension://",
        "edge://",
        "about:",
        "file://",
        "data:",
        "javascript:"
      ];
      return specialPagePrefixes.some((prefix) => url.startsWith(prefix));
    }
    async updateUsageStats(feature) {
      try {
        const result = await chrome.storage.local.get(["usageStats"]);
        const stats = result.usageStats || {};
        stats[feature] = (stats[feature] || 0) + 1;
        stats.lastUsed = Date.now();
        await chrome.storage.local.set({ usageStats: stats });
      } catch (error) {
        console.warn("[Background] 更新使用统计失败:", error);
      }
    }
  }
  new BackgroundService();
})();
