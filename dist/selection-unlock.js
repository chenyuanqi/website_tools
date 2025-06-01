var _ = function(exports) {
  "use strict";
  async function sendToBg(message) {
    return new Promise((resolve, reject) => {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now()
      };
      chrome.runtime.sendMessage(messageWithTimestamp, (response) => {
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
    // 通知事件
    SELECTION_UNLOCK_ENABLED: "SELECTION_UNLOCK_ENABLED"
  };
  class SelectionUnlockModule {
    // 强力模式标志
    constructor() {
      this.isEnabled = false;
      this.injectedStyle = null;
      this.isViolentMode = false;
      this.originalAddEventListener = EventTarget.prototype.addEventListener;
      this.init();
    }
    init() {
      console.log("[复制自由] 文本选择解锁模块初始化");
      chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
      this.checkWhitelistAndEnable();
    }
    async checkWhitelistAndEnable() {
      try {
        const host = window.location.host;
        const result = await chrome.storage.local.get(["copyFreedomWhitelist"]);
        const whitelist = result.copyFreedomWhitelist || [];
        if (whitelist.includes(host)) {
          console.log("[复制自由] 检测到白名单域名，自动启用:", host);
          this.enable();
        }
      } catch (error) {
        console.warn("[复制自由] 检查白名单失败:", error);
      }
    }
    handleMessage(request, sender, sendResponse) {
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
              details: "破解过程中发生异常，请刷新页面后重试"
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
        case "ENABLE_VIOLENT_MODE":
          this.enableViolentMode();
          sendResponse({ success: true });
          break;
        case "RESTORE_RIGHT_CLICK":
          this.restoreRightClick();
          sendResponse({ success: true });
          break;
        case "RESTORE_SHORTCUTS":
          this.restoreKeyboardShortcuts();
          sendResponse({ success: true });
          break;
      }
    }
    enable(mode) {
      if (this.isEnabled) {
        return {
          message: "复制限制已经解除，无需重复操作",
          details: "当前页面的复制限制已经成功破解"
        };
      }
      console.log("[复制自由] 启用文本选择解锁 - SuperCopy模式");
      const results = {
        cssInjection: false,
        handlerCleanup: false,
        cloneReplace: false,
        eventPatch: false,
        specialSites: false
      };
      let completedSteps = 0;
      let errorMessages = [];
      try {
        this.injectPowerfulStyles();
        results.cssInjection = true;
        completedSteps++;
      } catch (error) {
        errorMessages.push("CSS样式注入失败");
        console.warn("[复制自由] CSS注入失败:", error);
      }
      try {
        this.removeExplicitHandlers();
        results.handlerCleanup = true;
        completedSteps++;
      } catch (error) {
        errorMessages.push("事件处理器清理失败");
        console.warn("[复制自由] 事件处理器清理失败:", error);
      }
      try {
        this.cloneAndReplaceDocument();
        results.cloneReplace = true;
        completedSteps++;
      } catch (error) {
        errorMessages.push("DOM克隆替换失败");
        console.warn("[复制自由] clone&replace失败:", error);
      }
      try {
        this.patchEventListener();
        results.eventPatch = true;
        completedSteps++;
      } catch (error) {
        errorMessages.push("事件监听器拦截失败");
        console.warn("[复制自由] 事件拦截失败:", error);
      }
      try {
        this.handleSpecialSites();
        results.specialSites = true;
        completedSteps++;
      } catch (error) {
        errorMessages.push("特殊网站处理失败");
        console.warn("[复制自由] 特殊网站处理失败:", error);
      }
      this.isEnabled = true;
      sendToBg({
        type: MessageTypes.SELECTION_UNLOCK_ENABLED,
        data: { url: window.location.href, host: window.location.host }
      });
      if (completedSteps === 5) {
        return {
          message: "复制限制已完全破解！四层防护全部突破",
          details: `成功执行了所有5个破解步骤：CSS覆盖、事件清理、DOM替换、监听器拦截、特殊网站处理`
        };
      } else if (completedSteps >= 3) {
        return {
          message: `复制限制基本破解成功（${completedSteps}/5步）`,
          details: `主要功能已启用，部分高级功能可能受限。${errorMessages.length > 0 ? "问题：" + errorMessages.join("、") : ""}`
        };
      } else if (completedSteps >= 1) {
        return {
          message: `部分破解成功（${completedSteps}/5步）`,
          details: `基础功能可能生效，但保护较强。问题：${errorMessages.join("、")}。建议刷新页面重试`
        };
      } else {
        throw new Error(`破解失败，所有步骤都未成功。错误：${errorMessages.join("、")}`);
      }
    }
    disable() {
      console.log("[复制自由] 禁用文本选择解锁");
      if (this.injectedStyle) {
        this.injectedStyle.remove();
        this.injectedStyle = null;
      }
      this.restoreEventListener();
      if (this.isViolentMode) {
        this.disableViolentMode();
      }
      this.isEnabled = false;
      if (typeof window !== "undefined" && window.location && typeof window.location.reload === "function") {
        try {
          window.location.reload();
        } catch (error) {
          console.debug("[复制自由] 页面重新加载失败（可能在测试环境中）:", error);
        }
      }
    }
    toggle() {
      if (this.isEnabled) {
        this.disable();
      } else {
        this.enable();
      }
    }
    /**
     * 第一步：CSS层禁制 - 参考SuperCopy的强力样式
     */
    injectPowerfulStyles() {
      try {
        if (this.injectedStyle) {
          this.injectedStyle.remove();
        }
        this.injectedStyle = document.createElement("style");
        this.injectedStyle.id = "yuanqi-supercopy-unlock";
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
        console.warn("[复制自由] 样式注入失败:", error);
      }
    }
    /**
     * 第二步：JS层禁制(显式) - 扫描并删除现有的事件处理器
     */
    removeExplicitHandlers() {
      const violentEvents = ["copy", "cut", "contextmenu", "selectstart", "keydown", "mousedown", "dragstart"];
      const scrubNode = (node) => {
        violentEvents.forEach((event) => {
          const handler = `on${event}`;
          if (node[handler]) {
            node[handler] = null;
          }
        });
      };
      scrubNode(document);
      scrubNode(document.body);
      scrubNode(document.documentElement);
      const selectors = violentEvents.map((event) => `[on${event}]`).join(",");
      const elements = document.querySelectorAll(selectors);
      elements.forEach((element) => {
        violentEvents.forEach((event) => {
          element.removeAttribute(`on${event}`);
          element.removeAttribute("unselectable");
          element.removeAttribute("onselectstart");
          element.removeAttribute("ondragstart");
        });
        scrubNode(element);
      });
      console.log(`[复制自由] 清理了 ${elements.length} 个元素的事件处理器`);
    }
    /**
     * 第三步：clone&replace技巧 - SuperCopy的核心魔术
     */
    cloneAndReplaceDocument() {
      try {
        console.log("[复制自由] 执行clone&replace技巧");
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        const html = document.documentElement;
        const clone = html.cloneNode(true);
        html.replaceWith(clone);
        window.scrollTo(scrollX, scrollY);
        this.removeExplicitHandlers();
        console.log("[复制自由] clone&replace完成，已清空所有早期注册的事件监听器");
      } catch (error) {
        console.warn("[复制自由] clone&replace失败，使用备用方案:", error);
        try {
          const body = document.body;
          const bodyClone = body.cloneNode(true);
          body.replaceWith(bodyClone);
        } catch (e) {
          console.warn("[复制自由] 备用方案也失败:", e);
        }
      }
    }
    /**
     * 第四步：JS层禁制(动态) - 拦截新的事件监听器注册
     */
    patchEventListener() {
      const violentEvents = ["copy", "cut", "contextmenu", "selectstart", "keydown", "mousedown", "dragstart"];
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (violentEvents.includes(type)) {
          console.log(`[复制自由] 拦截并替换事件监听器: ${type}`);
          const interceptor = (event) => {
            console.log(`[复制自由] 拦截事件: ${event.type}`);
            event.stopPropagation();
            event.stopImmediatePropagation();
            if (type === "copy" || type === "cut") {
              return true;
            }
            return false;
          };
          const captureOptions = typeof options === "boolean" ? { capture: true } : { ...options, capture: true };
          return this.originalAddEventListener.call(this, type, interceptor, captureOptions);
        }
        return this.originalAddEventListener.call(this, type, listener, options);
      }.bind({ originalAddEventListener: this.originalAddEventListener });
      console.log("[复制自由] 已拦截addEventListener，新的禁用事件将被自动阻止");
    }
    /**
     * 强力模式 - 终极兜底方案
     */
    enableViolentMode() {
      if (this.isViolentMode) return;
      console.log("[复制自由] 启用强力模式 - contentEditable兜底");
      try {
        if (document.body) {
          document.body.contentEditable = "true";
          document.body.style.outline = "none";
        }
        document.designMode = "on";
        setTimeout(() => {
          if (document.designMode === "on") {
            document.designMode = "off";
          }
        }, 100);
        this.isViolentMode = true;
        console.log("[复制自由] 强力模式已启用");
      } catch (error) {
        console.warn("[复制自由] 强力模式启用失败:", error);
      }
    }
    disableViolentMode() {
      if (!this.isViolentMode) return;
      try {
        if (document.body) {
          document.body.contentEditable = "false";
          document.body.style.outline = "";
        }
        if (document.designMode === "on") {
          document.designMode = "off";
        }
        this.isViolentMode = false;
        console.log("[复制自由] 强力模式已禁用");
      } catch (error) {
        console.warn("[复制自由] 强力模式禁用失败:", error);
      }
    }
    /**
     * 恢复原始的addEventListener
     */
    restoreEventListener() {
      if (this.originalAddEventListener) {
        EventTarget.prototype.addEventListener = this.originalAddEventListener;
        console.log("[复制自由] 已恢复原始的addEventListener");
      }
    }
    /**
     * 恢复右键菜单
     */
    restoreRightClick() {
      console.log("[复制自由] 恢复右键菜单");
      document.oncontextmenu = null;
      if (document.body) {
        document.body.oncontextmenu = null;
      }
      const allElements = document.querySelectorAll("*");
      allElements.forEach((element) => {
        element.oncontextmenu = null;
        element.removeAttribute("oncontextmenu");
      });
      const existingStyle = document.getElementById("yuanqi-right-click-restore");
      if (existingStyle) {
        existingStyle.remove();
      }
      const style = document.createElement("style");
      style.id = "yuanqi-right-click-restore";
      style.textContent = `
      /* 确保右键菜单可用 */
      * {
        pointer-events: auto !important;
      }
    `;
      document.head.appendChild(style);
      console.log("[复制自由] 右键菜单已恢复");
    }
    /**
     * 恢复键盘快捷键
     */
    restoreKeyboardShortcuts() {
      console.log("[复制自由] 恢复键盘快捷键");
      document.onkeydown = null;
      document.onkeyup = null;
      document.onkeypress = null;
      if (document.body) {
        document.body.onkeydown = null;
        document.body.onkeyup = null;
        document.body.onkeypress = null;
      }
      const allElements = document.querySelectorAll("*");
      allElements.forEach((element) => {
        element.onkeydown = null;
        element.onkeyup = null;
        element.onkeypress = null;
        element.removeAttribute("onkeydown");
        element.removeAttribute("onkeyup");
        element.removeAttribute("onkeypress");
      });
      const keyboardHandler = (event) => {
        if (event.ctrlKey || event.metaKey) {
          if (["c", "a", "v", "x", "z", "y"].includes(event.key.toLowerCase())) {
            event.stopPropagation();
            return true;
          }
        }
        return true;
      };
      document.addEventListener("keydown", keyboardHandler, true);
      console.log("[复制自由] 键盘快捷键已恢复");
    }
    /**
     * 添加到白名单
     */
    async addToWhitelist() {
      try {
        const host = window.location.host;
        const result = await chrome.storage.local.get(["copyFreedomWhitelist"]);
        const whitelist = result.copyFreedomWhitelist || [];
        if (!whitelist.includes(host)) {
          whitelist.push(host);
          await chrome.storage.local.set({ copyFreedomWhitelist: whitelist });
          console.log("[复制自由] 已添加到白名单:", host);
        }
      } catch (error) {
        console.warn("[复制自由] 添加白名单失败:", error);
      }
    }
    /**
     * 从白名单移除
     */
    async removeFromWhitelist() {
      try {
        const host = window.location.host;
        const result = await chrome.storage.local.get(["copyFreedomWhitelist"]);
        const whitelist = result.copyFreedomWhitelist || [];
        const index = whitelist.indexOf(host);
        if (index > -1) {
          whitelist.splice(index, 1);
          await chrome.storage.local.set({ copyFreedomWhitelist: whitelist });
          console.log("[复制自由] 已从白名单移除:", host);
        }
      } catch (error) {
        console.warn("[复制自由] 移除白名单失败:", error);
      }
    }
    /**
     * 获取当前状态
     */
    getStatus() {
      return {
        enabled: this.isEnabled,
        violentMode: this.isViolentMode,
        host: window.location.host,
        url: window.location.href
      };
    }
    destroy() {
      if (this.isEnabled) {
        this.disable();
      }
      this.restoreEventListener();
      if (chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.removeListener(this.handleMessage.bind(this));
      }
      if (this.injectedStyle) {
        this.injectedStyle.remove();
        this.injectedStyle = null;
      }
    }
    /**
     * 第五步：特殊网站处理 - 针对飞书、知乎等网站的特殊处理
     */
    handleSpecialSites() {
      const hostname = window.location.hostname;
      if (hostname.includes("feishu.cn") || hostname.includes("larksuite.com")) {
        this.enableFeishuSpecialHandling();
      }
      if (hostname.includes("zhihu.com")) {
        this.enableZhihuSpecialHandling();
      }
      if (hostname.includes("jianshu.com")) {
        this.enableJianshuSpecialHandling();
      }
    }
    /**
     * 飞书文档特殊处理
     */
    enableFeishuSpecialHandling() {
      console.log("[复制自由] 启用飞书特殊处理");
      const feishuSelectors = [
        ".docs-reader",
        ".docs-editor",
        ".lark-docs",
        ".doc-content",
        ".text-content",
        '[data-testid="doc-content"]',
        ".suite-markdown-container",
        ".rich-text-container",
        ".editor-container",
        ".doc-render",
        ".doc-body",
        ".lark-editor",
        ".lark-content",
        ".feishu-editor",
        ".feishu-content",
        ".document-content",
        ".editor-content",
        ".content-wrapper",
        ".text-wrapper",
        ".paragraph",
        ".text-block",
        "[contenteditable]",
        "[data-slate-editor]",
        ".slate-editor"
      ];
      this.applySelectorsUnlock(feishuSelectors);
      const feishuStyle = document.createElement("style");
      feishuStyle.id = "yuanqi-feishu-special";
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
      this.removeAllFeishuRestrictions();
      this.startSpecialSiteObserver(feishuSelectors);
      this.startPeriodicCleanup(feishuSelectors);
      this.enableFeishuUltimateMode();
      console.log("[复制自由] 飞书特殊处理已启用");
    }
    /**
     * 强力清除所有飞书限制
     */
    removeAllFeishuRestrictions() {
      console.log("[复制自由] 执行飞书强力清理");
      document.onselectstart = null;
      document.ondragstart = null;
      document.oncontextmenu = null;
      document.onmousedown = null;
      document.onmouseup = null;
      document.oncopy = null;
      document.oncut = null;
      document.onpaste = null;
      if (document.body) {
        document.body.onselectstart = null;
        document.body.ondragstart = null;
        document.body.oncontextmenu = null;
        document.body.onmousedown = null;
        document.body.onmouseup = null;
        document.body.oncopy = null;
        document.body.oncut = null;
        document.body.onpaste = null;
        document.body.removeAttribute("unselectable");
        document.body.removeAttribute("onselectstart");
        document.body.removeAttribute("ondragstart");
        document.body.removeAttribute("oncontextmenu");
      }
      const allElements = document.querySelectorAll("*");
      allElements.forEach((element) => {
        this.unlockElement(element);
      });
      try {
        if (document.designMode) {
          document.designMode = "on";
          setTimeout(() => {
            document.designMode = "off";
          }, 100);
        }
      } catch (e) {
        console.warn("[复制自由] 设置designMode失败:", e);
      }
    }
    /**
     * 飞书终极模式 - 最强力的解锁方案
     */
    enableFeishuUltimateMode() {
      console.log("[复制自由] 启用飞书终极模式");
      this.overrideSelectionFunctions();
      this.interceptRestrictiveEvents();
      this.enableContentEditableMode();
      setInterval(() => {
        this.removeAllFeishuRestrictions();
      }, 500);
      this.setupImmediateUnlock();
    }
    /**
     * 覆盖选择相关函数
     */
    overrideSelectionFunctions() {
      if (window.getSelection) {
        const originalGetSelection = window.getSelection;
        window.getSelection = function() {
          try {
            return originalGetSelection.call(this);
          } catch (e) {
            return {
              toString: () => "",
              rangeCount: 0,
              addRange: () => {
              },
              removeAllRanges: () => {
              },
              getRangeAt: () => null,
              collapse: () => {
              },
              extend: () => {
              },
              selectAllChildren: () => {
              },
              deleteFromDocument: () => {
              },
              anchorNode: null,
              anchorOffset: 0,
              focusNode: null,
              focusOffset: 0,
              isCollapsed: false,
              type: "Range"
            };
          }
        };
      }
      if (document.execCommand) {
        const originalExecCommand = document.execCommand;
        document.execCommand = function(command, showUI, value) {
          try {
            return originalExecCommand.call(this, command, showUI, value);
          } catch (e) {
            console.log("[复制自由] execCommand被拦截，尝试强制执行:", command);
            return true;
          }
        };
      }
    }
    /**
     * 拦截限制性事件
     */
    interceptRestrictiveEvents() {
      const restrictiveEvents = [
        "selectstart",
        "dragstart",
        "contextmenu",
        "copy",
        "cut",
        "paste",
        "mousedown",
        "mouseup",
        "keydown",
        "keyup",
        "keypress"
      ];
      restrictiveEvents.forEach((eventType) => {
        document.addEventListener(eventType, (e) => {
          const target = e.target;
          if (this.isFeishuElement(target)) {
            console.log(`[复制自由] 拦截飞书限制事件: ${eventType}`);
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (["copy", "cut", "paste"].includes(eventType)) {
              return true;
            }
            if (["selectstart", "mousedown", "mouseup"].includes(eventType)) {
              return true;
            }
          }
        }, true);
      });
    }
    /**
     * 检查是否为飞书元素
     */
    isFeishuElement(element) {
      const feishuSelectors = [
        ".docs-reader",
        ".docs-editor",
        ".lark-docs",
        ".doc-content",
        ".text-content",
        '[data-testid="doc-content"]',
        ".suite-markdown-container",
        ".rich-text-container",
        ".editor-container",
        ".doc-render",
        ".doc-body",
        ".lark-editor",
        ".lark-content",
        ".feishu-editor",
        ".feishu-content"
      ];
      return feishuSelectors.some((selector) => {
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
    enableContentEditableMode() {
      const feishuContainers = document.querySelectorAll(`
      .docs-reader, .docs-editor, .lark-docs, .doc-content,
      .text-content, [data-testid="doc-content"], .suite-markdown-container,
      .rich-text-container, .editor-container, .doc-render, .doc-body
    `);
      feishuContainers.forEach((container) => {
        const element = container;
        element.contentEditable = "true";
        element.style.outline = "none";
        setTimeout(() => {
          element.contentEditable = "false";
        }, 100);
      });
    }
    /**
     * 设置立即解锁机制
     */
    setupImmediateUnlock() {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "attributes") {
            const target = mutation.target;
            if (this.isFeishuElement(target)) {
              this.unlockElement(target);
            }
          } else if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node;
                if (this.isFeishuElement(element)) {
                  this.unlockElement(element);
                }
                const children = element.querySelectorAll("*");
                children.forEach((child) => {
                  if (this.isFeishuElement(child)) {
                    this.unlockElement(child);
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
        attributeFilter: ["style", "class", "unselectable", "onselectstart", "ondragstart", "oncontextmenu"]
      });
    }
    /**
     * 知乎特殊处理
     */
    enableZhihuSpecialHandling() {
      console.log("[复制自由] 启用知乎特殊处理");
      const zhihuSelectors = [
        ".RichText",
        ".Post-RichText",
        ".AnswerItem",
        ".QuestionAnswer-content",
        ".ArticleItem-content",
        ".ContentItem-content"
      ];
      this.applySelectorsUnlock(zhihuSelectors);
      this.startSpecialSiteObserver(zhihuSelectors);
    }
    /**
     * 简书特殊处理
     */
    enableJianshuSpecialHandling() {
      console.log("[复制自由] 启用简书特殊处理");
      const jianshuSelectors = [
        ".article",
        "._2rhmJa",
        ".show-content",
        ".note"
      ];
      this.applySelectorsUnlock(jianshuSelectors);
      this.startSpecialSiteObserver(jianshuSelectors);
    }
    /**
     * 应用选择器解锁
     */
    applySelectorsUnlock(selectors) {
      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          this.unlockElement(element);
        });
      });
    }
    /**
     * 解锁单个元素
     */
    unlockElement(element) {
      element.style.userSelect = "text";
      element.style.webkitUserSelect = "text";
      element.style.mozUserSelect = "text";
      element.style.msUserSelect = "text";
      element.style.pointerEvents = "auto";
      element.style.cursor = "text";
      element.onselectstart = null;
      element.ondragstart = null;
      element.oncontextmenu = null;
      element.onmousedown = null;
      element.onmouseup = null;
      element.removeAttribute("unselectable");
      element.removeAttribute("onselectstart");
      element.removeAttribute("ondragstart");
      element.removeAttribute("oncontextmenu");
    }
    /**
     * 启动特殊网站观察器
     */
    startSpecialSiteObserver(selectors) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node;
                selectors.forEach((selector) => {
                  if (element.matches && element.matches(selector)) {
                    this.unlockElement(element);
                  }
                  const children = element.querySelectorAll(selector);
                  children.forEach((child) => {
                    this.unlockElement(child);
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
    startPeriodicCleanup(selectors) {
      setInterval(() => {
        this.applySelectorsUnlock(selectors);
        if (window.location.hostname.includes("feishu.cn") || window.location.hostname.includes("larksuite.com")) {
          this.removeAllFeishuRestrictions();
        }
      }, 200);
    }
  }
  (() => {
    const unlockModule = new SelectionUnlockModule();
    window.yuanqiSelectionUnlock = unlockModule;
  })();
  exports.SelectionUnlockModule = SelectionUnlockModule;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  return exports;
}({});
