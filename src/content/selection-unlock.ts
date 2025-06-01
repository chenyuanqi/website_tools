/**
 * 复制限制解除模块 - 基于SuperCopy核心思路优化
 * 参考SuperCopy的"魔术"实现更强力的解锁机制
 */

import { sendToBg, MessageTypes } from '@shared/messaging';

export class SelectionUnlockModule {
  private isEnabled = false;
  private injectedStyle: HTMLStyleElement | null = null;
  private originalAddEventListener: typeof EventTarget.prototype.addEventListener;
  private isViolentMode = false; // 强力模式标志

  constructor() {
    this.originalAddEventListener = EventTarget.prototype.addEventListener;
    this.init();
  }

  private init(): void {
    console.log('[复制自由] 文本选择解锁模块初始化');
    
    // 监听来自background的消息
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // 检查是否在白名单中，自动启用
    this.checkWhitelistAndEnable();
  }

  private async checkWhitelistAndEnable(): Promise<void> {
    try {
      const host = window.location.host;
      const result = await chrome.storage.local.get(['copyFreedomWhitelist']);
      const whitelist = result.copyFreedomWhitelist || [];
      
      if (whitelist.includes(host)) {
        console.log('[复制自由] 检测到白名单域名，自动启用:', host);
        this.enable();
      }
    } catch (error) {
      console.warn('[复制自由] 检查白名单失败:', error);
    }
  }

  private handleMessage(request: any, sender: any, sendResponse: Function): void {
    const { type, data } = request;
    
    switch (type) {
      case MessageTypes.ENABLE_TEXT_SELECTION:
        try {
          const result = this.enable(data?.mode);
          this.addToWhitelist();
          sendResponse({ 
            success: true, 
            message: result.message,
            details: result.details
          });
        } catch (error) {
          sendResponse({ 
            success: false, 
            error: error.message,
            details: '破解过程中发生异常，请刷新页面后重试'
          });
        }
        break;
      case MessageTypes.DISABLE_TEXT_SELECTION:
        this.disable();
        this.removeFromWhitelist();
        sendResponse({ success: true });
        break;
      case MessageTypes.TOGGLE_TEXT_SELECTION:
        this.toggle();
        sendResponse({ success: true, enabled: this.isEnabled });
        break;
      case 'ENABLE_VIOLENT_MODE':
        this.enableViolentMode();
        sendResponse({ success: true });
        break;
      case 'RESTORE_RIGHT_CLICK':
        this.restoreRightClick();
        sendResponse({ success: true });
        break;
      case 'RESTORE_SHORTCUTS':
        this.restoreKeyboardShortcuts();
        sendResponse({ success: true });
        break;
    }
  }

  public enable(mode?: string): any {
    if (this.isEnabled) {
      return {
        message: '复制限制已经解除，无需重复操作',
        details: '当前页面的复制限制已经成功破解'
      };
    }
    
    console.log('[复制自由] 启用文本选择解锁 - SuperCopy模式');
    
    const results = {
      cssInjection: false,
      handlerCleanup: false,
      cloneReplace: false,
      eventPatch: false,
      specialSites: false
    };
    
    let completedSteps = 0;
    let errorMessages: string[] = [];
    
    try {
      // 第一步：CSS层禁制 - 硬覆盖所有样式
      this.injectPowerfulStyles();
      results.cssInjection = true;
      completedSteps++;
    } catch (error) {
      errorMessages.push('CSS样式注入失败');
      console.warn('[复制自由] CSS注入失败:', error);
    }
    
    try {
      // 第二步：JS层禁制(显式) - 清理现有的事件处理器
      this.removeExplicitHandlers();
      results.handlerCleanup = true;
      completedSteps++;
    } catch (error) {
      errorMessages.push('事件处理器清理失败');
      console.warn('[复制自由] 事件处理器清理失败:', error);
    }
    
    try {
      // 第三步：clone&replace技巧 - 清空早期注册的监听器
      this.cloneAndReplaceDocument();
      results.cloneReplace = true;
      completedSteps++;
    } catch (error) {
      errorMessages.push('DOM克隆替换失败');
      console.warn('[复制自由] clone&replace失败:', error);
    }
    
    try {
      // 第四步：JS层禁制(动态) - 拦截新的事件监听器
      this.patchEventListener();
      results.eventPatch = true;
      completedSteps++;
    } catch (error) {
      errorMessages.push('事件监听器拦截失败');
      console.warn('[复制自由] 事件拦截失败:', error);
    }
    
    try {
      // 第五步：特殊网站处理 - 针对飞书、知乎等网站的特殊处理
      this.handleSpecialSites();
      results.specialSites = true;
      completedSteps++;
    } catch (error) {
      errorMessages.push('特殊网站处理失败');
      console.warn('[复制自由] 特殊网站处理失败:', error);
    }
    
    this.isEnabled = true;
    
    // 通知background
    sendToBg({
      type: MessageTypes.SELECTION_UNLOCK_ENABLED,
      data: { url: window.location.href, host: window.location.host }
    });
    
    // 生成结果报告
    if (completedSteps === 5) {
      return {
        message: '复制限制已完全破解！四层防护全部突破',
        details: `成功执行了所有5个破解步骤：CSS覆盖、事件清理、DOM替换、监听器拦截、特殊网站处理`
      };
    } else if (completedSteps >= 3) {
      return {
        message: `复制限制基本破解成功（${completedSteps}/5步）`,
        details: `主要功能已启用，部分高级功能可能受限。${errorMessages.length > 0 ? '问题：' + errorMessages.join('、') : ''}`
      };
    } else if (completedSteps >= 1) {
      return {
        message: `部分破解成功（${completedSteps}/5步）`,
        details: `基础功能可能生效，但保护较强。问题：${errorMessages.join('、')}。建议刷新页面重试`
      };
    } else {
      throw new Error(`破解失败，所有步骤都未成功。错误：${errorMessages.join('、')}`);
    }
  }

  public disable(): void {
    console.log('[复制自由] 禁用文本选择解锁');
    
    // 移除注入的样式
    if (this.injectedStyle) {
      this.injectedStyle.remove();
      this.injectedStyle = null;
    }
    
    // 恢复原始的addEventListener
    this.restoreEventListener();
    
    // 退出强力模式
    if (this.isViolentMode) {
      this.disableViolentMode();
    }
    
    this.isEnabled = false;
    
    // 在测试环境中不重新加载页面
    if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
      try {
        // 重新加载页面以完全恢复
        window.location.reload();
      } catch (error) {
        // 在测试环境中可能会失败，忽略错误
        console.debug('[复制自由] 页面重新加载失败（可能在测试环境中）:', error);
      }
    }
  }

  public toggle(): void {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * 第一步：CSS层禁制 - 参考SuperCopy的强力样式
   */
  private injectPowerfulStyles(): void {
    try {
      // 移除旧样式
      if (this.injectedStyle) {
        this.injectedStyle.remove();
      }
      
      // 创建SuperCopy风格的强力样式
      this.injectedStyle = document.createElement('style');
      this.injectedStyle.id = 'yuanqi-supercopy-unlock';
      this.injectedStyle.textContent = `
        /* SuperCopy核心样式 - 硬覆盖所有禁用样式 */
        * {
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
          -webkit-touch-callout: text !important;
          pointer-events: auto !important;
        }
        
        /* 应对cursor:none的骚操作 */
        html, body {
          cursor: auto !important;
        }
        
        /* 覆盖可能的内联样式 */
        [style*="user-select: none"],
        [style*="user-select:none"],
        [style*="-webkit-user-select: none"],
        [style*="-webkit-user-select:none"] {
          user-select: text !important;
          -webkit-user-select: text !important;
        }
        
        /* 确保所有元素都可以被选择 */
        [unselectable="on"] {
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          user-select: text !important;
        }
        
        /* 移除可能的拖拽禁用 */
        * {
          -webkit-user-drag: auto !important;
          -khtml-user-drag: auto !important;
          -moz-user-drag: auto !important;
          -o-user-drag: auto !important;
          user-drag: auto !important;
        }
      `;
      
      document.head.appendChild(this.injectedStyle);
    } catch (error) {
      console.warn('[复制自由] 样式注入失败:', error);
      // 继续执行，不抛出错误
    }
  }

  /**
   * 第二步：JS层禁制(显式) - 扫描并删除现有的事件处理器
   */
  private removeExplicitHandlers(): void {
    const violentEvents = ['copy', 'cut', 'contextmenu', 'selectstart', 'keydown', 'mousedown', 'dragstart'];
    
    // 清理document上的事件处理器
    const scrubNode = (node: any) => {
      violentEvents.forEach(event => {
        const handler = `on${event}`;
        if (node[handler]) {
          node[handler] = null;
        }
      });
    };
    
    // 清理document
    scrubNode(document);
    scrubNode(document.body);
    scrubNode(document.documentElement);
    
    // 扫描所有元素，删除内联事件处理器
    const selectors = violentEvents.map(event => `[on${event}]`).join(',');
    const elements = document.querySelectorAll(selectors);
    
    elements.forEach(element => {
      violentEvents.forEach(event => {
        element.removeAttribute(`on${event}`);
        element.removeAttribute('unselectable');
        element.removeAttribute('onselectstart');
        element.removeAttribute('ondragstart');
      });
      
      // 清理JavaScript属性
      scrubNode(element);
    });
    
    console.log(`[复制自由] 清理了 ${elements.length} 个元素的事件处理器`);
  }

  /**
   * 第三步：clone&replace技巧 - SuperCopy的核心魔术
   */
  private cloneAndReplaceDocument(): void {
    try {
      console.log('[复制自由] 执行clone&replace技巧');
      
      // 保存当前滚动位置
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      
      // 克隆整个文档元素
      const html = document.documentElement;
      const clone = html.cloneNode(true) as HTMLElement;
      
      // 替换文档元素 - 这会清空所有通过addEventListener注册的监听器
      html.replaceWith(clone);
      
      // 恢复滚动位置
      window.scrollTo(scrollX, scrollY);
      
      // 重新清理克隆后的内联事件
      this.removeExplicitHandlers();
      
      console.log('[复制自由] clone&replace完成，已清空所有早期注册的事件监听器');
    } catch (error) {
      console.warn('[复制自由] clone&replace失败，使用备用方案:', error);
      // 备用方案：只清理body
      try {
        const body = document.body;
        const bodyClone = body.cloneNode(true) as HTMLElement;
        body.replaceWith(bodyClone);
      } catch (e) {
        console.warn('[复制自由] 备用方案也失败:', e);
      }
    }
  }

  /**
   * 第四步：JS层禁制(动态) - 拦截新的事件监听器注册
   */
  private patchEventListener(): void {
    const violentEvents = ['copy', 'cut', 'contextmenu', 'selectstart', 'keydown', 'mousedown', 'dragstart'];
    
    // Monkey-patch EventTarget.prototype.addEventListener
    EventTarget.prototype.addEventListener = function(
      type: string, 
      listener: EventListenerOrEventListenerObject | null, 
      options?: boolean | AddEventListenerOptions
    ) {
      // 如果是禁用复制的事件，用我们的拦截器替换
      if (violentEvents.includes(type)) {
        console.log(`[复制自由] 拦截并替换事件监听器: ${type}`);
        
        // 创建拦截器函数
        const interceptor = (event: Event) => {
          console.log(`[复制自由] 拦截事件: ${event.type}`);
          event.stopPropagation();
          event.stopImmediatePropagation();
          
          // 对于某些事件，我们需要返回true来允许默认行为
          if (type === 'copy' || type === 'cut') {
            return true;
          }
          
          // 阻止默认行为，但允许我们的处理
          return false;
        };
        
        // 使用capture模式确保我们的拦截器优先执行
        const captureOptions = typeof options === 'boolean' 
          ? { capture: true } 
          : { ...options, capture: true };
          
        return this.originalAddEventListener.call(this, type, interceptor, captureOptions);
      }
      
      // 非禁用事件，正常注册
      return this.originalAddEventListener.call(this, type, listener, options);
    }.bind({ originalAddEventListener: this.originalAddEventListener });
    
    console.log('[复制自由] 已拦截addEventListener，新的禁用事件将被自动阻止');
  }

  /**
   * 强力模式 - 终极兜底方案
   */
  public enableViolentMode(): void {
    if (this.isViolentMode) return;
    
    console.log('[复制自由] 启用强力模式 - contentEditable兜底');
    
    try {
      // 设置整个body为可编辑
      if (document.body) {
        document.body.contentEditable = 'true';
        document.body.style.outline = 'none'; // 移除编辑框样式
      }
      
      // 启用设计模式
      document.designMode = 'on';
      
      // 立即关闭设计模式，只是为了触发可编辑状态
      setTimeout(() => {
        if (document.designMode === 'on') {
          document.designMode = 'off';
        }
      }, 100);
      
      this.isViolentMode = true;
      
      console.log('[复制自由] 强力模式已启用');
    } catch (error) {
      console.warn('[复制自由] 强力模式启用失败:', error);
    }
  }

  private disableViolentMode(): void {
    if (!this.isViolentMode) return;
    
    try {
      if (document.body) {
        document.body.contentEditable = 'false';
        document.body.style.outline = '';
      }
      
      if (document.designMode === 'on') {
        document.designMode = 'off';
      }
      
      this.isViolentMode = false;
      console.log('[复制自由] 强力模式已禁用');
    } catch (error) {
      console.warn('[复制自由] 强力模式禁用失败:', error);
    }
  }

  /**
   * 恢复原始的addEventListener
   */
  private restoreEventListener(): void {
    if (this.originalAddEventListener) {
      EventTarget.prototype.addEventListener = this.originalAddEventListener;
      console.log('[复制自由] 已恢复原始的addEventListener');
    }
  }

  /**
   * 恢复右键菜单
   */
  public restoreRightClick(): void {
    console.log('[复制自由] 恢复右键菜单');
    
    // 移除document级别的右键限制
    document.oncontextmenu = null;
    if (document.body) {
      document.body.oncontextmenu = null;
    }
    
    // 移除所有元素的右键限制
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      (element as any).oncontextmenu = null;
      element.removeAttribute('oncontextmenu');
    });
    
    // 创建CSS样式确保右键菜单可用
    const existingStyle = document.getElementById('yuanqi-right-click-restore');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'yuanqi-right-click-restore';
    style.textContent = `
      /* 确保右键菜单可用 */
      * {
        pointer-events: auto !important;
      }
    `;
    
    document.head.appendChild(style);
    
    console.log('[复制自由] 右键菜单已恢复');
  }

  /**
   * 恢复键盘快捷键
   */
  public restoreKeyboardShortcuts(): void {
    console.log('[复制自由] 恢复键盘快捷键');
    
    // 移除document级别的键盘限制
    document.onkeydown = null;
    document.onkeyup = null;
    document.onkeypress = null;
    
    // 移除body级别的键盘限制
    if (document.body) {
      document.body.onkeydown = null;
      document.body.onkeyup = null;
      document.body.onkeypress = null;
    }
    
    // 移除所有元素的键盘限制
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      (element as any).onkeydown = null;
      (element as any).onkeyup = null;
      (element as any).onkeypress = null;
      element.removeAttribute('onkeydown');
      element.removeAttribute('onkeyup');
      element.removeAttribute('onkeypress');
    });
    
    // 添加键盘事件处理器来确保快捷键正常工作
    const keyboardHandler = (event: KeyboardEvent) => {
      // 允许常用快捷键
      if (event.ctrlKey || event.metaKey) {
        // Ctrl+C, Ctrl+A, Ctrl+V 等
        if (['c', 'a', 'v', 'x', 'z', 'y'].includes(event.key.toLowerCase())) {
          event.stopPropagation();
          return true;
        }
      }
      return true;
    };
    
    document.addEventListener('keydown', keyboardHandler, true);
    
    console.log('[复制自由] 键盘快捷键已恢复');
  }

  /**
   * 添加到白名单
   */
  private async addToWhitelist(): Promise<void> {
    try {
      const host = window.location.host;
      const result = await chrome.storage.local.get(['copyFreedomWhitelist']);
      const whitelist = result.copyFreedomWhitelist || [];
      
      if (!whitelist.includes(host)) {
        whitelist.push(host);
        await chrome.storage.local.set({ copyFreedomWhitelist: whitelist });
        console.log('[复制自由] 已添加到白名单:', host);
      }
    } catch (error) {
      console.warn('[复制自由] 添加白名单失败:', error);
    }
  }

  /**
   * 从白名单移除
   */
  private async removeFromWhitelist(): Promise<void> {
    try {
      const host = window.location.host;
      const result = await chrome.storage.local.get(['copyFreedomWhitelist']);
      const whitelist = result.copyFreedomWhitelist || [];
      
      const index = whitelist.indexOf(host);
      if (index > -1) {
        whitelist.splice(index, 1);
        await chrome.storage.local.set({ copyFreedomWhitelist: whitelist });
        console.log('[复制自由] 已从白名单移除:', host);
      }
    } catch (error) {
      console.warn('[复制自由] 移除白名单失败:', error);
    }
  }

  /**
   * 获取当前状态
   */
  public getStatus(): any {
    return {
      enabled: this.isEnabled,
      violentMode: this.isViolentMode,
      host: window.location.host,
      url: window.location.href
    };
  }

  public destroy(): void {
    // 禁用功能
    if (this.isEnabled) {
      this.disable();
    }
    
    // 恢复原始事件监听器
    this.restoreEventListener();
    
    // 移除消息监听器
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.removeListener(this.handleMessage.bind(this));
    }
    
    // 清理注入的样式
    if (this.injectedStyle) {
      this.injectedStyle.remove();
      this.injectedStyle = null;
    }
  }

  /**
   * 第五步：特殊网站处理 - 针对飞书、知乎等网站的特殊处理
   */
  private handleSpecialSites(): void {
    const hostname = window.location.hostname;
    
    // 飞书文档特殊处理
    if (hostname.includes('feishu.cn') || hostname.includes('larksuite.com')) {
      this.enableFeishuSpecialHandling();
    }
    
    // 知乎特殊处理
    if (hostname.includes('zhihu.com')) {
      this.enableZhihuSpecialHandling();
    }
    
    // 简书特殊处理
    if (hostname.includes('jianshu.com')) {
      this.enableJianshuSpecialHandling();
    }
  }

  /**
   * 飞书文档特殊处理
   */
  private enableFeishuSpecialHandling(): void {
    console.log('[复制自由] 启用飞书特殊处理');
    
    // 飞书可能使用的特殊类名和选择器 - 扩展更多选择器
    const feishuSelectors = [
      '.docs-reader',
      '.docs-editor', 
      '.lark-docs',
      '.doc-content',
      '.text-content',
      '[data-testid="doc-content"]',
      '.suite-markdown-container',
      '.rich-text-container',
      '.editor-container',
      '.doc-render',
      '.doc-body',
      '.lark-editor',
      '.lark-content',
      '.feishu-editor',
      '.feishu-content',
      '.document-content',
      '.editor-content',
      '.content-wrapper',
      '.text-wrapper',
      '.paragraph',
      '.text-block',
      '[contenteditable]',
      '[data-slate-editor]',
      '.slate-editor'
    ];
    
    // 强制启用这些元素的文本选择
    this.applySelectorsUnlock(feishuSelectors);
    
    // 特殊CSS覆盖飞书的限制 - 更强力的样式
    const feishuStyle = document.createElement('style');
    feishuStyle.id = 'yuanqi-feishu-special';
    feishuStyle.textContent = `
      /* 飞书特殊处理 - 超强力CSS覆盖 */
      * {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        -webkit-touch-callout: default !important;
        pointer-events: auto !important;
        cursor: text !important;
      }
      
      /* 针对飞书特定元素的强制覆盖 */
      .docs-reader, .docs-reader *,
      .docs-editor, .docs-editor *,
      .lark-docs, .lark-docs *,
      .doc-content, .doc-content *,
      .text-content, .text-content *,
      [data-testid="doc-content"], [data-testid="doc-content"] *,
      .suite-markdown-container, .suite-markdown-container *,
      .rich-text-container, .rich-text-container *,
      .editor-container, .editor-container *,
      .doc-render, .doc-render *,
      .doc-body, .doc-body *,
      .lark-editor, .lark-editor *,
      .lark-content, .lark-content *,
      .feishu-editor, .feishu-editor *,
      .feishu-content, .feishu-content *,
      .document-content, .document-content *,
      .editor-content, .editor-content *,
      .content-wrapper, .content-wrapper *,
      .text-wrapper, .text-wrapper *,
      .paragraph, .paragraph *,
      .text-block, .text-block *,
      [contenteditable], [contenteditable] *,
      [data-slate-editor], [data-slate-editor] *,
      .slate-editor, .slate-editor * {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        -webkit-touch-callout: default !important;
        pointer-events: auto !important;
        cursor: text !important;
      }
      
      /* 覆盖所有可能的内联样式 */
      [style*="user-select: none"],
      [style*="user-select:none"],
      [style*="-webkit-user-select: none"],
      [style*="-webkit-user-select:none"],
      [style*="-moz-user-select: none"],
      [style*="-moz-user-select:none"],
      [style*="-ms-user-select: none"],
      [style*="-ms-user-select:none"],
      [style*="pointer-events: none"],
      [style*="pointer-events:none"],
      [style*="cursor: default"],
      [style*="cursor:default"] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        pointer-events: auto !important;
        cursor: text !important;
      }
      
      /* 强制覆盖所有可能的禁用样式 */
      [unselectable="on"],
      [onselectstart],
      [ondragstart],
      [oncontextmenu] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        pointer-events: auto !important;
        cursor: text !important;
      }
    `;
    
    document.head.appendChild(feishuStyle);
    
    // 强力清除所有可能的事件限制
    this.removeAllFeishuRestrictions();
    
    // 监控飞书可能动态添加的限制
    this.startSpecialSiteObserver(feishuSelectors);
    
    // 更频繁的定期清理飞书限制
    this.startPeriodicCleanup(feishuSelectors);
    
    // 额外的强力措施
    this.enableFeishuUltimateMode();
    
    console.log('[复制自由] 飞书特殊处理已启用');
  }

  /**
   * 强力清除所有飞书限制
   */
  private removeAllFeishuRestrictions(): void {
    console.log('[复制自由] 执行飞书强力清理');
    
    // 清除document级别的限制
    document.onselectstart = null;
    document.ondragstart = null;
    document.oncontextmenu = null;
    document.onmousedown = null;
    document.onmouseup = null;
    document.oncopy = null;
    document.oncut = null;
    document.onpaste = null;
    
    // 清除body级别的限制
    if (document.body) {
      document.body.onselectstart = null;
      document.body.ondragstart = null;
      document.body.oncontextmenu = null;
      document.body.onmousedown = null;
      document.body.onmouseup = null;
      document.body.oncopy = null;
      document.body.oncut = null;
      document.body.onpaste = null;
      
      // 移除body的禁用属性
      document.body.removeAttribute('unselectable');
      document.body.removeAttribute('onselectstart');
      document.body.removeAttribute('ondragstart');
      document.body.removeAttribute('oncontextmenu');
    }
    
    // 清除所有元素的限制
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      this.unlockElement(element as HTMLElement);
    });
    
    // 强制设置document的选择模式
    try {
      if (document.designMode) {
        document.designMode = 'on';
        setTimeout(() => {
          document.designMode = 'off';
        }, 100);
      }
    } catch (e) {
      console.warn('[复制自由] 设置designMode失败:', e);
    }
  }

  /**
   * 飞书终极模式 - 最强力的解锁方案
   */
  private enableFeishuUltimateMode(): void {
    console.log('[复制自由] 启用飞书终极模式');
    
    // 1. 覆盖所有可能的选择相关函数
    this.overrideSelectionFunctions();
    
    // 2. 拦截并阻止所有限制性事件
    this.interceptRestrictiveEvents();
    
    // 3. 强制启用contentEditable模式
    this.enableContentEditableMode();
    
    // 4. 定时强制清理（更频繁）
    setInterval(() => {
      this.removeAllFeishuRestrictions();
    }, 500); // 每500毫秒清理一次
    
    // 5. 监听页面变化并立即处理
    this.setupImmediateUnlock();
  }

  /**
   * 覆盖选择相关函数
   */
  private overrideSelectionFunctions(): void {
    // 保护getSelection函数
    if (window.getSelection) {
      const originalGetSelection = window.getSelection;
      window.getSelection = function() {
        try {
          return originalGetSelection.call(this);
        } catch (e) {
          // 如果被阻止，返回一个模拟的Selection对象
          return {
            toString: () => '',
            rangeCount: 0,
            addRange: () => {},
            removeAllRanges: () => {},
            getRangeAt: () => null,
            collapse: () => {},
            extend: () => {},
            selectAllChildren: () => {},
            deleteFromDocument: () => {},
            anchorNode: null,
            anchorOffset: 0,
            focusNode: null,
            focusOffset: 0,
            isCollapsed: false,
            type: 'Range'
          } as any;
        }
      };
    }
    
    // 保护document.execCommand
    if (document.execCommand) {
      const originalExecCommand = document.execCommand;
      document.execCommand = function(command: string, showUI?: boolean, value?: string) {
        try {
          return originalExecCommand.call(this, command, showUI, value);
        } catch (e) {
          console.log('[复制自由] execCommand被拦截，尝试强制执行:', command);
          return true;
        }
      };
    }
  }

  /**
   * 拦截限制性事件
   */
  private interceptRestrictiveEvents(): void {
    const restrictiveEvents = [
      'selectstart', 'dragstart', 'contextmenu', 'copy', 'cut', 'paste',
      'mousedown', 'mouseup', 'keydown', 'keyup', 'keypress'
    ];
    
    restrictiveEvents.forEach(eventType => {
      document.addEventListener(eventType, (e) => {
        // 检查是否在飞书相关元素中
        const target = e.target as HTMLElement;
        if (this.isFeishuElement(target)) {
          console.log(`[复制自由] 拦截飞书限制事件: ${eventType}`);
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // 对于某些事件，允许默认行为
          if (['copy', 'cut', 'paste'].includes(eventType)) {
            // 不阻止默认行为，允许复制粘贴
            return true;
          }
          
          // 对于选择相关事件，也不阻止
          if (['selectstart', 'mousedown', 'mouseup'].includes(eventType)) {
            return true;
          }
        }
      }, true); // 使用capture模式确保优先执行
    });
  }

  /**
   * 检查是否为飞书元素
   */
  private isFeishuElement(element: HTMLElement): boolean {
    const feishuSelectors = [
      '.docs-reader', '.docs-editor', '.lark-docs', '.doc-content',
      '.text-content', '[data-testid="doc-content"]', '.suite-markdown-container',
      '.rich-text-container', '.editor-container', '.doc-render', '.doc-body',
      '.lark-editor', '.lark-content', '.feishu-editor', '.feishu-content'
    ];
    
    return feishuSelectors.some(selector => {
      try {
        return element.closest(selector) !== null;
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * 启用contentEditable模式
   */
  private enableContentEditableMode(): void {
    const feishuContainers = document.querySelectorAll(`
      .docs-reader, .docs-editor, .lark-docs, .doc-content,
      .text-content, [data-testid="doc-content"], .suite-markdown-container,
      .rich-text-container, .editor-container, .doc-render, .doc-body
    `);
    
    feishuContainers.forEach(container => {
      const element = container as HTMLElement;
      element.contentEditable = 'true';
      element.style.outline = 'none';
      
      // 立即关闭编辑模式，只是为了触发可选择状态
      setTimeout(() => {
        element.contentEditable = 'false';
      }, 100);
    });
  }

  /**
   * 设置立即解锁机制
   */
  private setupImmediateUnlock(): void {
    // 使用MutationObserver监听DOM变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          if (this.isFeishuElement(target)) {
            // 立即解锁新的限制
            this.unlockElement(target);
          }
        } else if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              if (this.isFeishuElement(element)) {
                this.unlockElement(element);
              }
              // 解锁所有子元素
              const children = element.querySelectorAll('*');
              children.forEach(child => {
                if (this.isFeishuElement(child as HTMLElement)) {
                  this.unlockElement(child as HTMLElement);
                }
              });
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'unselectable', 'onselectstart', 'ondragstart', 'oncontextmenu']
    });
  }

  /**
   * 知乎特殊处理
   */
  private enableZhihuSpecialHandling(): void {
    console.log('[复制自由] 启用知乎特殊处理');
    
    const zhihuSelectors = [
      '.RichText',
      '.Post-RichText',
      '.AnswerItem',
      '.QuestionAnswer-content',
      '.ArticleItem-content',
      '.ContentItem-content'
    ];
    
    this.applySelectorsUnlock(zhihuSelectors);
    this.startSpecialSiteObserver(zhihuSelectors);
  }

  /**
   * 简书特殊处理
   */
  private enableJianshuSpecialHandling(): void {
    console.log('[复制自由] 启用简书特殊处理');
    
    const jianshuSelectors = [
      '.article',
      '._2rhmJa',
      '.show-content',
      '.note'
    ];
    
    this.applySelectorsUnlock(jianshuSelectors);
    this.startSpecialSiteObserver(jianshuSelectors);
  }

  /**
   * 应用选择器解锁
   */
  private applySelectorsUnlock(selectors: string[]): void {
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        this.unlockElement(element as HTMLElement);
      });
    });
  }

  /**
   * 解锁单个元素
   */
  private unlockElement(element: HTMLElement): void {
    // 设置样式
    element.style.userSelect = 'text';
    element.style.webkitUserSelect = 'text';
    element.style.mozUserSelect = 'text';
    element.style.msUserSelect = 'text';
    element.style.pointerEvents = 'auto';
    element.style.cursor = 'text';
    
    // 移除所有可能的事件监听器
    (element as any).onselectstart = null;
    (element as any).ondragstart = null;
    (element as any).oncontextmenu = null;
    (element as any).onmousedown = null;
    (element as any).onmouseup = null;
    
    // 移除禁用属性
    element.removeAttribute('unselectable');
    element.removeAttribute('onselectstart');
    element.removeAttribute('ondragstart');
    element.removeAttribute('oncontextmenu');
  }

  /**
   * 启动特殊网站观察器
   */
  private startSpecialSiteObserver(selectors: string[]): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              // 对新添加的节点也应用解锁
              selectors.forEach(selector => {
                if (element.matches && element.matches(selector)) {
                  this.unlockElement(element);
                }
                const children = element.querySelectorAll(selector);
                children.forEach(child => {
                  this.unlockElement(child as HTMLElement);
                });
              });
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * 启动定期清理
   */
  private startPeriodicCleanup(selectors: string[]): void {
    setInterval(() => {
      this.applySelectorsUnlock(selectors);
      // 如果是飞书网站，执行额外的强力清理
      if (window.location.hostname.includes('feishu.cn') || 
          window.location.hostname.includes('larksuite.com')) {
        this.removeAllFeishuRestrictions();
      }
    }, 200); // 每200毫秒清理一次，更频繁
  }
}

// 自动初始化 - 立即执行，不等待DOM
(() => {
  // 立即创建实例，确保尽早拦截
  const unlockModule = new SelectionUnlockModule();
  
  // 暴露到全局，方便调试和其他模块访问
  (window as any).yuanqiSelectionUnlock = unlockModule;
})(); 