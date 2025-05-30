/**
 * 网页工具扩展主内容脚本
 * 负责初始化所有功能模块并协调它们的工作
 */

(function() {
  'use strict';
  
  // 防止重复注入
  if (window.websiteToolsInjected) {
    console.log('[网页工具] 内容脚本已存在，跳过重复注入');
    return;
  }
  window.websiteToolsInjected = true;
  
  console.log('[网页工具] 内容脚本开始加载，当前URL:', window.location.href);
  console.log('[网页工具] DOM状态:', document.readyState);
  
  // 常量定义（从constants.js复制）
  const MODULES = {
    LINK_MANAGER: 'linkManager',
    COPY_FREEDOM: 'copyFreedom',
    MEDIA_EXTRACTOR: 'mediaExtractor'
  };

  const MESSAGE_TYPES = {
    // 链接管理相关
    OPEN_LINK_IN_NEW_TAB: 'openLinkInNewTab',
    SHOW_LINK_PREVIEW: 'showLinkPreview',
    GET_LINK_STATS: 'getLinkStats',
    ENABLE_NEW_TAB_MODE: 'enableNewTabMode',
    ENABLE_PREVIEW_MODE: 'enablePreviewMode',
    
    // 复制限制解除相关
    ENABLE_TEXT_SELECTION: 'enableTextSelection',
    RESTORE_RIGHT_CLICK: 'restoreRightClick',
    RESTORE_SHORTCUTS: 'restoreShortcuts',
    RESTORE_KEYBOARD_SHORTCUTS: 'restoreKeyboardShortcuts',
    
    // 媒体提取相关
    EXTRACT_IMAGES: 'extractImages',
    EXTRACT_VIDEOS: 'extractVideos',
    EXTRACT_AUDIO: 'extractAudio',
    GET_MEDIA_STATS: 'getMediaStats',
    
    // 设置相关
    GET_SETTINGS: 'getSettings',
    UPDATE_SETTINGS: 'updateSettings',
    
    // 通用消息
    GET_PAGE_INFO: 'getPageInfo',
    SHOW_NOTIFICATION: 'showNotification',
    EXTRACT_LINKS: 'extractLinks'
  };

  const DEFAULT_SETTINGS = {
    [MODULES.LINK_MANAGER]: {
      enabled: true,
      newTabForExternal: true,
      popupPreview: false,
      customRules: []
    },
    [MODULES.COPY_FREEDOM]: {
      enabled: true,
      textSelection: true,
      rightClickMenu: true,
      keyboardShortcuts: true
    },
    [MODULES.MEDIA_EXTRACTOR]: {
      enabled: true,
      autoDetectImages: true,
      autoDetectVideos: false,
      autoDetectAudio: false
    }
  };

  const STORAGE_KEYS = {
    SETTINGS: 'websiteToolsSettings',
    WHITELIST: 'websiteToolsWhitelist',
    STATISTICS: 'websiteToolsStatistics'
  };
  
  // 引入工具函数（从utils.js）
  const Logger = {
    prefix: '[网页工具]',
    log: function(message, ...args) {
      console.log(`${this.prefix} ${message}`, ...args);
    },
    warn: function(message, ...args) {
      console.warn(`${this.prefix} ${message}`, ...args);
    },
    error: function(message, ...args) {
      console.error(`${this.prefix} ${message}`, ...args);
    }
  };

  const DOMUtils = {
    addCSS: function(css, id = 'website-tools-styles') {
      if (document.getElementById(id)) {
        return;
      }
      const style = document.createElement('style');
      style.id = id;
      style.textContent = css;
      document.head.appendChild(style);
    }
  };
  
  Logger.log('内容脚本开始初始化');
  
  /**
   * 主控制器类
   */
  class WebsiteToolsController {
    constructor() {
      console.log('[网页工具] WebsiteToolsController 构造函数开始');
      console.log('[网页工具] 当前URL:', window.location.href);
      console.log('[网页工具] DOM状态:', document.readyState);
      
      this.modules = new Map();
      this.settings = null;
      this.isEnabled = true;
      
      this.init();
    }
    
    /**
     * 初始化控制器
     */
    async init() {
      try {
        console.log('[网页工具] 开始初始化控制器...');
        
        // 加载设置
        console.log('[网页工具] 开始加载设置...');
        await this.loadSettings();
        console.log('[网页工具] 设置加载完成');
        
        // 检查当前网站是否在白名单中
        if (this.isWhitelisted()) {
          Logger.log('当前网站在白名单中，跳过功能注入');
          return;
        }
        
        // 初始化各个功能模块
        console.log('[网页工具] 开始初始化功能模块...');
        this.initModules();
        console.log('[网页工具] 功能模块初始化完成');
        
        // 设置消息监听
        console.log('[网页工具] 开始设置消息监听...');
        this.setupMessageListener();
        console.log('[网页工具] 消息监听设置完成');
        
        // 监听设置变化
        console.log('[网页工具] 开始设置变化监听...');
        this.setupSettingsListener();
        console.log('[网页工具] 设置变化监听完成');
        
        Logger.log('内容脚本初始化完成');
        
      } catch (error) {
        console.error('[网页工具] 初始化失败:', error);
        console.error('[网页工具] 错误堆栈:', error.stack);
        Logger.error('初始化失败:', error);
      }
    }
    
    /**
     * 加载设置
     */
    async loadSettings() {
      try {
        const result = await chrome.storage.sync.get([STORAGE_KEYS.SETTINGS]);
        this.settings = result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
        Logger.log('设置加载完成:', this.settings);
      } catch (error) {
        Logger.error('加载设置失败:', error);
        this.settings = DEFAULT_SETTINGS;
      }
    }
    
    /**
     * 检查当前网站是否在白名单中
     */
    isWhitelisted() {
      // TODO: 实现白名单检查逻辑
      return false;
    }
    
    /**
     * 初始化功能模块
     */
    initModules() {
      // 复制限制解除模块（优先级最高）
      if (this.settings[MODULES.COPY_FREEDOM]?.enabled) {
        this.initCopyFreedomModule();
      }
      
      // 链接管理模块
      if (this.settings[MODULES.LINK_MANAGER]?.enabled) {
        this.initLinkManagerModule();
      }
      
      // 媒体提取模块
      if (this.settings[MODULES.MEDIA_EXTRACTOR]?.enabled) {
        this.initMediaExtractorModule();
      }
    }
    
    /**
     * 初始化复制限制解除模块
     */
    initCopyFreedomModule() {
      const module = new CopyFreedomModule(this.settings[MODULES.COPY_FREEDOM]);
      this.modules.set(MODULES.COPY_FREEDOM, module);
      Logger.log('复制限制解除模块已初始化');
    }
    
    /**
     * 初始化链接管理模块
     */
    initLinkManagerModule() {
      const module = new LinkManagerModule(this.settings[MODULES.LINK_MANAGER]);
      this.modules.set(MODULES.LINK_MANAGER, module);
      Logger.log('链接管理模块已初始化');
    }
    
    /**
     * 初始化媒体提取模块
     */
    initMediaExtractorModule() {
      const module = new MediaExtractorModule(this.settings[MODULES.MEDIA_EXTRACTOR]);
      this.modules.set(MODULES.MEDIA_EXTRACTOR, module);
      Logger.log('媒体提取模块已初始化');
    }
    
    /**
     * 设置消息监听器
     */
    setupMessageListener() {
      console.log('[网页工具] 正在设置消息监听器...');
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('[网页工具] 收到消息:', request);
        this.handleMessage(request, sender, sendResponse);
        return true; // 保持消息通道开放
      });
      console.log('[网页工具] 消息监听器设置完成');
    }
    
    /**
     * 处理来自其他组件的消息
     */
    async handleMessage(request, sender, sendResponse) {
      try {
        const { type, data } = request;
        
        switch (type) {
          case MESSAGE_TYPES.GET_PAGE_INFO:
            sendResponse(this.getPageInfo());
            break;
            
          case MESSAGE_TYPES.UPDATE_SETTINGS:
            await this.updateSettings(data);
            sendResponse({ success: true });
            break;
            
          case MESSAGE_TYPES.ENABLE_TEXT_SELECTION:
            this.toggleModule(MODULES.COPY_FREEDOM, 'textSelection', data.enabled);
            sendResponse({ success: true });
            break;
            
          default:
            // 转发给相应的模块处理
            const module = this.getModuleByMessageType(type);
            if (module && typeof module.handleMessage === 'function') {
              const result = await module.handleMessage(request);
              sendResponse(result);
            } else {
              sendResponse({ error: '未知的消息类型' });
            }
        }
      } catch (error) {
        Logger.error('处理消息失败:', error);
        sendResponse({ error: error.message });
      }
    }
    
    /**
     * 获取页面信息
     */
    getPageInfo() {
      const images = document.querySelectorAll('img');
      const videos = document.querySelectorAll('video');
      const audios = document.querySelectorAll('audio');
      const links = document.querySelectorAll('a');
      
      return {
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname,
        imageCount: images.length,
        videoCount: videos.length,
        audioCount: audios.length,
        linkCount: links.length,
        hasImages: images.length > 0,
        hasVideos: videos.length > 0,
        hasAudio: audios.length > 0,
        timestamp: Date.now()
      };
    }
    
    /**
     * 更新设置
     */
    async updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings };
      await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: this.settings });
      
      // 重新初始化模块
      this.reinitializeModules();
    }
    
    /**
     * 重新初始化模块
     */
    reinitializeModules() {
      // 清理现有模块
      this.modules.forEach(module => {
        if (typeof module.destroy === 'function') {
          module.destroy();
        }
      });
      this.modules.clear();
      
      // 重新初始化
      this.initModules();
    }
    
    /**
     * 切换模块功能
     */
    toggleModule(moduleName, feature, enabled) {
      const module = this.modules.get(moduleName);
      if (module && typeof module.toggle === 'function') {
        module.toggle(feature, enabled);
      }
    }
    
    /**
     * 根据消息类型获取对应模块
     */
    getModuleByMessageType(messageType) {
      // 根据消息类型前缀判断属于哪个模块
      if (messageType.includes('LINK')) {
        return this.modules.get(MODULES.LINK_MANAGER);
      } else if (messageType.includes('COPY') || messageType.includes('TEXT') || messageType.includes('RIGHT')) {
        return this.modules.get(MODULES.COPY_FREEDOM);
      } else if (messageType.includes('EXTRACT') || messageType.includes('MEDIA')) {
        return this.modules.get(MODULES.MEDIA_EXTRACTOR);
      }
      return null;
    }
    
    /**
     * 设置监听器
     */
    setupSettingsListener() {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes[STORAGE_KEYS.SETTINGS]) {
          this.settings = changes[STORAGE_KEYS.SETTINGS].newValue;
          this.reinitializeModules();
          Logger.log('设置已更新，重新初始化模块');
        }
      });
    }
  }
  
  /**
   * 简单的复制限制解除模块实现
   */
  class CopyFreedomModule {
    constructor(settings) {
      this.settings = settings;
      this.originalStyles = new Map();
      this.init();
    }
    
    init() {
      if (this.settings.textSelection) {
        this.enableTextSelection();
      }
      
      if (this.settings.rightClickMenu) {
        this.restoreRightClick();
      }
      
      if (this.settings.keyboardShortcuts) {
        this.restoreKeyboardShortcuts();
      }
    }
    
    /**
     * 启用文本选择
     */
    enableTextSelection() {
      const css = `
        * {
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
          user-select: text !important;
        }
      `;
      DOMUtils.addCSS(css, 'website-tools-text-selection');
      Logger.log('文本选择已启用');
    }
    
    /**
     * 恢复右键菜单
     */
    restoreRightClick() {
      // 移除现有的右键菜单阻止事件
      document.addEventListener('contextmenu', function(e) {
        e.stopPropagation();
      }, true);
      
      // 阻止阻止右键的事件
      const events = ['contextmenu', 'selectstart', 'dragstart'];
      events.forEach(eventType => {
        document.addEventListener(eventType, function(e) {
          e.stopPropagation();
        }, true);
      });
      
      Logger.log('右键菜单已恢复');
    }
    
    /**
     * 恢复键盘快捷键
     */
    restoreKeyboardShortcuts() {
      document.addEventListener('keydown', function(e) {
        // 允许常用快捷键
        if (e.ctrlKey || e.metaKey) {
          const allowedKeys = ['c', 'v', 'a', 'x', 'z', 'y'];
          if (allowedKeys.includes(e.key.toLowerCase())) {
            e.stopPropagation();
          }
        }
      }, true);
      
      Logger.log('键盘快捷键已恢复');
    }
    
    /**
     * 切换功能
     */
    toggle(feature, enabled) {
      this.settings[feature] = enabled;
      
      if (feature === 'textSelection') {
        if (enabled) {
          this.enableTextSelection();
        } else {
          const style = document.getElementById('website-tools-text-selection');
          if (style) {
            style.remove();
          }
        }
      }
      
      Logger.log(`${feature} 已${enabled ? '启用' : '禁用'}`);
    }
    
    /**
     * 销毁模块
     */
    destroy() {
      // 清理添加的样式
      const style = document.getElementById('website-tools-text-selection');
      if (style) {
        style.remove();
      }
      
      Logger.log('复制限制解除模块已销毁');
    }
  }
  
  /**
   * 链接管理模块实现
   */
  class LinkManagerModule {
    constructor(settings) {
      this.settings = settings;
      this.linkStats = { total: 0, external: 0, internal: 0 };
      this.currentMode = 'none'; // 'none', 'newTab', 'preview'
      this.linkClickHandler = null;
      this.linkHoverHandler = null;
      this.processedLinks = new Set(); // 记录已处理的链接
      this.init();
    }
    
    init() {
      this.analyzeLinks();
      this.setupLinkMode();
    }
    
    /**
     * 设置链接处理模式（互斥功能）
     */
    setupLinkMode() {
      // 清理之前的模式
      this.clearLinkMode();
      
      // 确定当前模式（优先级：新标签页 > 预览）
      if (this.settings.newTabForExternal) {
        this.currentMode = 'newTab';
        this.enableNewTabMode();
      } else if (this.settings.popupPreview) {
        this.currentMode = 'preview';
        this.enablePreviewMode();
      } else {
        this.currentMode = 'none';
      }
      
      Logger.log(`链接管理模式已设置为: ${this.currentMode}`);
    }
    
    /**
     * 清理当前链接处理模式
     */
    clearLinkMode() {
      // 移除事件监听器
      if (this.linkClickHandler) {
        document.removeEventListener('click', this.linkClickHandler, true);
        this.linkClickHandler = null;
      }
      
      if (this.linkHoverHandler) {
        document.removeEventListener('mouseenter', this.linkHoverHandler, true);
        document.removeEventListener('mouseleave', this.linkHoverHandler, true);
        this.linkHoverHandler = null;
      }
      
      // 清理链接节点上的标记和样式
      this.processedLinks.forEach(linkSelector => {
        const link = document.querySelector(linkSelector);
        if (link) {
          link.removeAttribute('data-website-tools-processed');
          link.classList.remove('website-tools-external-link', 'website-tools-preview-link');
        }
      });
      this.processedLinks.clear();
      
      // 清理预览元素
      document.querySelectorAll('.website-tools-link-preview').forEach(el => el.remove());
      
      this.currentMode = 'none';
    }
    
    /**
     * 启用新标签页模式
     */
    enableNewTabMode() {
      const currentDomain = window.location.hostname;
      
      // 标记外部链接并添加样式
      this.markExternalLinks();
      
      // 添加新标签页样式
      const css = `
        .website-tools-external-link {
          position: relative;
        }
        .website-tools-external-link::after {
          content: "↗";
          font-size: 0.8em;
          color: #666;
          margin-left: 2px;
          opacity: 0.7;
        }
        .website-tools-external-link:hover::after {
          opacity: 1;
          color: #007bff;
        }
      `;
      DOMUtils.addCSS(css, 'website-tools-external-links');
      
      // 创建点击事件处理器
      this.linkClickHandler = (e) => {
        if (!e.target || typeof e.target.closest !== 'function') return;
        
        const link = e.target.closest('a[href]');
        if (!link || !link.href) return;
        
        // 检查是否为已标记的外部链接
        if (link.classList.contains('website-tools-external-link')) {
          e.preventDefault();
          e.stopPropagation();
          
          // 在新标签页打开
          window.open(link.href, '_blank', 'noopener,noreferrer');
          Logger.log('外部链接已在新标签页打开:', link.href);
        }
      };
      
      document.addEventListener('click', this.linkClickHandler, true);
      Logger.log('新标签页模式已启用');
    }
    
    /**
     * 启用预览模式
     */
    enablePreviewMode() {
      // 标记所有链接并添加预览样式
      this.markAllLinks();
      
      // 添加预览样式
      const css = `
        .website-tools-preview-link {
          position: relative;
          border-bottom: 1px dotted #ccc;
        }
        .website-tools-preview-link:hover {
          border-bottom-color: #007bff;
        }
        .website-tools-link-preview {
          position: absolute;
          background: #333;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          z-index: 10000;
          pointer-events: none;
          max-width: 350px;
          word-break: break-all;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .website-tools-link-preview.show {
          opacity: 1;
        }
        .website-tools-link-preview::before {
          content: "";
          position: absolute;
          top: -5px;
          left: 10px;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-bottom: 5px solid #333;
        }
      `;
      DOMUtils.addCSS(css, 'website-tools-link-preview');
      
      // 创建悬停事件处理器
      this.linkHoverHandler = (e) => {
        if (!e.target || typeof e.target.closest !== 'function') return;
        
        const link = e.target.closest('a[href]');
        if (!link || !link.classList.contains('website-tools-preview-link')) return;
        
        if (e.type === 'mouseenter') {
          this.showLinkPreview(link, e);
        } else if (e.type === 'mouseleave') {
          this.hideLinkPreview(link);
        }
      };
      
      document.addEventListener('mouseenter', this.linkHoverHandler, true);
      document.addEventListener('mouseleave', this.linkHoverHandler, true);
      
      Logger.log('预览模式已启用');
    }
    
    /**
     * 标记外部链接
     */
    markExternalLinks() {
      const currentDomain = window.location.hostname;
      const links = document.querySelectorAll('a[href]');
      
      links.forEach((link, index) => {
        try {
          const url = new URL(link.href, window.location.href);
          const isExternal = url.hostname !== currentDomain;
          
          if (isExternal) {
            link.classList.add('website-tools-external-link');
            link.setAttribute('data-website-tools-processed', 'external');
            link.setAttribute('title', `外部链接: ${link.href}`);
            
            // 记录处理过的链接
            const selector = `a[href="${link.href}"]`;
            this.processedLinks.add(selector);
          }
        } catch (e) {
          // 忽略无效链接
        }
      });
      
      Logger.log(`已标记 ${this.processedLinks.size} 个外部链接`);
    }
    
    /**
     * 标记所有链接（用于预览模式）
     */
    markAllLinks() {
      const links = document.querySelectorAll('a[href]');
      
      links.forEach((link, index) => {
        if (!link.getAttribute('data-website-tools-processed')) {
          link.classList.add('website-tools-preview-link');
          link.setAttribute('data-website-tools-processed', 'preview');
          
          // 记录处理过的链接
          const selector = `a[href="${link.href}"]`;
          this.processedLinks.add(selector);
        }
      });
      
      Logger.log(`已标记 ${this.processedLinks.size} 个链接用于预览`);
    }
    
    /**
     * 显示链接预览
     */
    showLinkPreview(link, event) {
      // 移除现有预览
      this.hideLinkPreview();
      
      // 创建预览元素
      const preview = document.createElement('div');
      preview.className = 'website-tools-link-preview';
      
      // 构建预览内容
      const url = new URL(link.href, window.location.href);
      const isExternal = url.hostname !== window.location.hostname;
      
      preview.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">
          ${isExternal ? '🔗 外部链接' : '🏠 内部链接'}
        </div>
        <div style="font-size: 11px; opacity: 0.9;">
          ${link.href}
        </div>
        ${link.title ? `<div style="font-size: 10px; opacity: 0.7; margin-top: 4px;">${link.title}</div>` : ''}
      `;
      
      document.body.appendChild(preview);
      
      // 定位预览框
      const rect = link.getBoundingClientRect();
      const previewRect = preview.getBoundingClientRect();
      
      let left = rect.left;
      let top = rect.bottom + 8;
      
      // 防止预览框超出视窗
      if (left + previewRect.width > window.innerWidth) {
        left = window.innerWidth - previewRect.width - 10;
      }
      if (top + previewRect.height > window.innerHeight) {
        top = rect.top - previewRect.height - 8;
      }
      
      preview.style.left = left + 'px';
      preview.style.top = top + 'px';
      
      // 显示动画
      setTimeout(() => preview.classList.add('show'), 10);
      
      // 存储引用以便清理
      link._websiteToolsPreview = preview;
    }
    
    /**
     * 隐藏链接预览
     */
    hideLinkPreview(link = null) {
      if (link && link._websiteToolsPreview) {
        link._websiteToolsPreview.remove();
        delete link._websiteToolsPreview;
      } else {
        // 清理所有预览
        document.querySelectorAll('.website-tools-link-preview').forEach(el => el.remove());
      }
    }
    
    /**
     * 分析页面链接
     */
    analyzeLinks() {
      const links = document.querySelectorAll('a[href]');
      const currentDomain = window.location.hostname;
      
      this.linkStats = { total: 0, external: 0, internal: 0 };
      
      links.forEach(link => {
        this.linkStats.total++;
        
        try {
          const url = new URL(link.href, window.location.href);
          if (url.hostname === currentDomain) {
            this.linkStats.internal++;
          } else {
            this.linkStats.external++;
          }
        } catch (e) {
          // 忽略无效链接
        }
      });
      
      Logger.log('链接分析完成:', this.linkStats);
    }
    
    /**
     * 获取链接统计
     */
    getLinkStats() {
      return {
        ...this.linkStats,
        currentMode: this.currentMode,
        processedCount: this.processedLinks.size
      };
    }
    
    /**
     * 处理消息
     */
    async handleMessage(request) {
      const { type } = request;
      
      switch (type) {
        case MESSAGE_TYPES.GET_LINK_STATS:
          return this.getLinkStats();
        case MESSAGE_TYPES.EXTRACT_LINKS:
          return this.extractLinks();
        default:
          return { error: '未知的消息类型' };
      }
    }
    
    /**
     * 切换功能（确保互斥）
     */
    toggle(feature, enabled) {
      const oldSettings = { ...this.settings };
      this.settings[feature] = enabled;
      
      // 如果启用了一个功能，自动禁用另一个
      if (enabled) {
        if (feature === 'newTabForExternal') {
          this.settings.popupPreview = false;
        } else if (feature === 'popupPreview') {
          this.settings.newTabForExternal = false;
        }
      }
      
      // 重新设置模式
      this.setupLinkMode();
      
      Logger.log(`链接管理功能已更新:`, {
        from: oldSettings,
        to: this.settings,
        currentMode: this.currentMode
      });
    }
    
    /**
     * 销毁模块
     */
    destroy() {
      this.clearLinkMode();
      
      // 清理添加的样式
      const styles = ['website-tools-external-links', 'website-tools-link-preview'];
      styles.forEach(id => {
        const style = document.getElementById(id);
        if (style) style.remove();
      });
      
      Logger.log('链接管理模块已销毁');
    }
    
    /**
     * 提取页面所有链接
     */
    extractLinks() {
      const links = document.querySelectorAll('a[href]');
      const currentDomain = window.location.hostname;
      const extractedLinks = [];
      
      links.forEach((link, index) => {
        try {
          const url = new URL(link.href, window.location.href);
          const isExternal = url.hostname !== currentDomain;
          
          // 获取链接文本
          let linkText = link.textContent.trim();
          if (!linkText) {
            // 如果没有文本，尝试获取图片alt或title
            const img = link.querySelector('img');
            if (img) {
              linkText = img.alt || img.title || '图片链接';
            } else {
              linkText = link.title || '无标题链接';
            }
          }
          
          // 限制文本长度
          if (linkText.length > 50) {
            linkText = linkText.substring(0, 47) + '...';
          }
          
          extractedLinks.push({
            id: index + 1,
            href: link.href,
            text: linkText,
            title: link.title || '',
            isExternal: isExternal,
            domain: url.hostname,
            protocol: url.protocol,
            pathname: url.pathname,
            element: {
              tagName: link.tagName,
              className: link.className,
              id: link.id
            }
          });
        } catch (e) {
          // 忽略无效链接
          Logger.warn('无效链接:', link.href, e);
        }
      });
      
      // 按类型分组
      const grouped = {
        internal: extractedLinks.filter(link => !link.isExternal),
        external: extractedLinks.filter(link => link.isExternal),
        total: extractedLinks.length
      };
      
      Logger.log('链接提取完成:', {
        total: grouped.total,
        internal: grouped.internal.length,
        external: grouped.external.length
      });
      
      return {
        links: extractedLinks,
        grouped: grouped,
        stats: {
          total: grouped.total,
          internal: grouped.internal.length,
          external: grouped.external.length
        }
      };
    }
  }
  
  /**
   * 媒体提取模块实现
   */
  class MediaExtractorModule {
    constructor(settings) {
      this.settings = settings;
      this.mediaStats = { images: 0, videos: 0, audio: 0 };
      this.init();
    }
    
    init() {
      this.analyzeMedia();
    }
    
    /**
     * 分析页面媒体
     */
    analyzeMedia() {
      this.mediaStats = {
        images: document.querySelectorAll('img').length,
        videos: document.querySelectorAll('video').length,
        audio: document.querySelectorAll('audio').length
      };
      
      Logger.log('媒体分析完成:', this.mediaStats);
    }
    
    /**
     * 提取图片
     */
    extractImages() {
      const images = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt || '',
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        size: this.getImageSize(img)
      })).filter(img => img.src && img.width > 50 && img.height > 50); // 过滤小图片
      
      Logger.log('图片提取完成:', images.length);
      return images;
    }
    
    /**
     * 提取视频
     */
    extractVideos() {
      const videos = Array.from(document.querySelectorAll('video')).map(video => ({
        src: video.src || (video.currentSrc || ''),
        poster: video.poster || '',
        duration: video.duration || 0,
        width: video.videoWidth || video.width,
        height: video.videoHeight || video.height
      })).filter(video => video.src);
      
      Logger.log('视频提取完成:', videos.length);
      return videos;
    }
    
    /**
     * 获取图片大小估算
     */
    getImageSize(img) {
      // 简单的大小估算
      const area = (img.naturalWidth || img.width) * (img.naturalHeight || img.height);
      if (area > 500000) return 'large';
      if (area > 100000) return 'medium';
      return 'small';
    }
    
    /**
     * 获取媒体统计
     */
    getMediaStats() {
      return this.mediaStats;
    }
    
    /**
     * 处理消息
     */
    async handleMessage(request) {
      const { type } = request;
      
      switch (type) {
        case MESSAGE_TYPES.EXTRACT_IMAGES:
          const images = this.extractImages();
          return { images: images };
        case MESSAGE_TYPES.EXTRACT_VIDEOS:
          const videos = this.extractVideos();
          return { videos: videos };
        case MESSAGE_TYPES.GET_MEDIA_STATS:
          return this.getMediaStats();
        default:
          return { error: '未知的消息类型' };
      }
    }
    
    /**
     * 切换功能
     */
    toggle(feature, enabled) {
      this.settings[feature] = enabled;
      Logger.log(`媒体提取 ${feature} 已${enabled ? '启用' : '禁用'}`);
    }
    
    /**
     * 销毁模块
     */
    destroy() {
      Logger.log('媒体提取模块已销毁');
    }
  }
  
  // 等待DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new WebsiteToolsController();
    });
  } else {
    new WebsiteToolsController();
  }
  
})(); 