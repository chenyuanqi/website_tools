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
        this.enable();
        this.addToWhitelist();
        sendResponse({ success: true });
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

  public enable(): void {
    if (this.isEnabled) return;
    
    console.log('[复制自由] 启用文本选择解锁 - SuperCopy模式');
    
    // 第一步：CSS层禁制 - 硬覆盖所有样式
    this.injectPowerfulStyles();
    
    // 第二步：JS层禁制(显式) - 清理现有的事件处理器
    this.removeExplicitHandlers();
    
    // 第三步：clone&replace技巧 - 清空早期注册的监听器
    this.cloneAndReplaceDocument();
    
    // 第四步：JS层禁制(动态) - 拦截新的事件监听器
    this.patchEventListener();
    
    this.isEnabled = true;
    
    // 通知background
    sendToBg({
      type: MessageTypes.SELECTION_UNLOCK_ENABLED,
      data: { url: window.location.href, host: window.location.host }
    });
  }

  public disable(): void {
    if (!this.isEnabled) return;
    
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
    
    // 重新加载页面以完全恢复
    window.location.reload();
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
    this.disable();
    chrome.runtime.onMessage.removeListener(this.handleMessage.bind(this));
  }
}

// 自动初始化 - 立即执行，不等待DOM
(() => {
  // 立即创建实例，确保尽早拦截
  const unlockModule = new SelectionUnlockModule();
  
  // 暴露到全局，方便调试和其他模块访问
  (window as any).yuanqiSelectionUnlock = unlockModule;
})(); 