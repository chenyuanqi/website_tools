/**
 * 简化版content script - 用于测试消息通信
 */

console.log('[网页工具-简化版] Content Script 开始加载');
console.log('[网页工具-简化版] 当前URL:', window.location.href);
console.log('[网页工具-简化版] 当前时间:', new Date().toISOString());

// 防止重复注入
if (window.websiteToolsSimpleInjected) {
    console.log('[网页工具-简化版] 已存在，跳过重复注入');
} else {
    window.websiteToolsSimpleInjected = true;
    
    // 功能状态
    let newTabMode = false;
    let previewMode = false;
    let currentLinkHandler = null;
    let rightClickEnabled = false;
    let shortcutsEnabled = false;
    
    console.log('[网页工具-简化版] 开始设置消息监听器...');
    
    /**
     * 初始化扩展功能
     */
    async function initializeExtension() {
        try {
            console.log('[网页工具-简化版] 开始初始化扩展功能...');
            
            // 加载用户配置
            const result = await chrome.storage.sync.get(['websiteToolsSettings']);
            const settings = result.websiteToolsSettings || {};
            
            console.log('[网页工具-简化版] 加载的配置:', settings);
            
            // 根据配置自动启用功能
            if (settings.linkManager && settings.linkManager.enabled) {
                // 检查新标签页功能
                if (settings.linkManager.newTabForExternal) {
                    console.log('[网页工具-简化版] 自动启用新标签页功能');
                    enableNewTabMode(true);
                }
                
                // 检查Target属性模式
                if (settings.linkManager.targetBlankMode) {
                    console.log('[网页工具-简化版] 自动启用Target属性模式');
                    enableTargetBlankMode(true);
                }
                
                // 检查预览功能
                if (settings.linkManager.popupPreview) {
                    console.log('[网页工具-简化版] 自动启用预览功能');
                    enablePreviewMode(true);
                }
            }
            
            // 复制自由功能自动启用
            if (settings.copyFreedom && settings.copyFreedom.enabled) {
                if (settings.copyFreedom.textSelection) {
                    console.log('[网页工具-简化版] 自动启用文本选择');
                    enableTextSelection();
                }
                
                if (settings.copyFreedom.rightClickMenu) {
                    console.log('[网页工具-简化版] 自动启用右键菜单');
                    restoreRightClick();
                }
                
                if (settings.copyFreedom.keyboardShortcuts) {
                    console.log('[网页工具-简化版] 自动启用键盘快捷键');
                    restoreKeyboardShortcuts();
                }
            }
            
            console.log('[网页工具-简化版] 扩展功能初始化完成');
            
        } catch (error) {
            console.error('[网页工具-简化版] 初始化失败:', error);
        }
    }
    
    // 等待DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeExtension);
    } else {
        // 如果DOM已经加载完成，延迟一点时间确保页面稳定
        setTimeout(initializeExtension, 100);
    }
    
    /**
     * 监听配置变化，自动应用新设置
     */
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.websiteToolsSettings) {
            const newSettings = changes.websiteToolsSettings.newValue || {};
            console.log('[网页工具-简化版] 配置发生变化，重新应用设置:', newSettings);
            
            // 重新初始化功能
            initializeExtension();
        }
    });
    
    console.log('[网页工具-简化版] 配置监听器已设置');
    
    // 设置消息监听器
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('[网页工具-简化版] 收到消息:', request);
        
        try {
            const { type, data } = request;
            
            switch (type) {
                case 'GET_PAGE_INFO':
                case 'getPageInfo':
                    const pageInfo = {
                        url: window.location.href,
                        title: document.title,
                        domain: window.location.hostname,
                        linkCount: document.querySelectorAll('a').length,
                        imageCount: document.querySelectorAll('img').length,
                        videoCount: document.querySelectorAll('video').length,
                        audioCount: document.querySelectorAll('audio').length,
                        timestamp: Date.now()
                    };
                    console.log('[网页工具-简化版] 返回页面信息:', pageInfo);
                    sendResponse(pageInfo);
                    break;
                    
                case 'GET_LINK_STATS':
                case 'getLinkStats':
                    const links = Array.from(document.querySelectorAll('a'));
                    const currentDomain = window.location.hostname;
                    const external = links.filter(link => {
                        try {
                            const url = new URL(link.href);
                            return url.hostname !== currentDomain;
                        } catch (e) {
                            return false;
                        }
                    }).length;
                    
                    const linkStats = {
                        total: links.length,
                        external: external,
                        internal: links.length - external
                    };
                    console.log('[网页工具-简化版] 返回链接统计:', linkStats);
                    sendResponse(linkStats);
                    break;
                    
                case 'ENABLE_TEXT_SELECTION':
                case 'enableTextSelection':
                    enableTextSelection();
                    // 特别针对飞书等网站的额外处理
                    if (window.location.hostname.includes('feishu.cn') || 
                        window.location.hostname.includes('larksuite.com')) {
                        enableFeishuSpecialHandling();
                    }
                    sendResponse({ success: true });
                    break;
                    
                case 'RESTORE_RIGHT_CLICK':
                case 'restoreRightClick':
                    restoreRightClick();
                    sendResponse({ success: true });
                    break;
                    
                case 'RESTORE_SHORTCUTS':
                case 'restoreShortcuts':
                    restoreKeyboardShortcuts();
                    sendResponse({ success: true });
                    break;
                    
                case 'EXTRACT_IMAGES':
                case 'extractImages':
                    const images = extractImagesFromPage();
                    console.log('[网页工具-简化版] 提取图片完成:', images.length, '张');
                    sendResponse({ images, success: true });
                    break;
                    
                case 'EXTRACT_VIDEOS':
                case 'extractVideos':
                    const videos = extractVideosFromPage();
                    console.log('[网页工具-简化版] 提取视频完成:', videos.length, '个');
                    sendResponse({ videos, success: true });
                    break;
                    
                case 'EXTRACT_AUDIO':
                case 'extractAudio':
                    const audio = extractAudioFromPage();
                    console.log('[网页工具-简化版] 提取音频完成:', audio.length, '个');
                    sendResponse({ audio, success: true });
                    break;
                    
                case 'ENABLE_NEW_TAB_MODE':
                case 'enableNewTabMode':
                    enableNewTabMode(data?.enabled !== false);
                    sendResponse({ success: true });
                    break;
                    
                case 'ENABLE_PREVIEW_MODE':
                case 'enablePreviewMode':
                    enablePreviewMode(data?.enabled !== false);
                    sendResponse({ success: true });
                    break;
                    
                case 'ENABLE_TARGET_BLANK_MODE':
                case 'enableTargetBlankMode':
                    enableTargetBlankMode(data?.enabled !== false);
                    sendResponse({ success: true });
                    break;
                    
                default:
                    console.log('[网页工具-简化版] 未知消息类型:', type);
                    sendResponse({ error: '未知的消息类型: ' + type });
            }
            
        } catch (error) {
            console.error('[网页工具-简化版] 处理消息失败:', error);
            sendResponse({ error: error.message });
        }
        
        return true; // 保持消息通道开放
    });
    
    /**
     * 启用文本选择 - 增强版
     */
    function enableTextSelection() {
        console.log('[网页工具-简化版] 启用增强版文本选择');
        
        // 移除现有样式
        const existingStyle = document.getElementById('website-tools-text-selection');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // 添加强力CSS样式
        const style = document.createElement('style');
        style.id = 'website-tools-text-selection';
        style.textContent = `
            *, *::before, *::after {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                -webkit-touch-callout: default !important;
                -webkit-tap-highlight-color: transparent !important;
            }
            
            body, html {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
            
            /* 特别针对飞书等常见限制类名 */
            .no-select, .noselect, .unselectable, .disable-select {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
            
            /* 覆盖可能的内联样式 */
            [style*="user-select"] {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
        `;
        document.head.appendChild(style);
        
        // 强力清除所有事件监听器
        removeAllSelectRestrictions();
        
        // 覆盖Document和Element原型方法
        overrideDocumentMethods();
        
        // 持续监控并移除新添加的限制
        startContinuousMonitoring();
        
        console.log('[网页工具-简化版] 增强版文本选择已启用');
    }
    
    /**
     * 移除所有选择限制
     */
    function removeAllSelectRestrictions() {
        // 移除document级别的事件监听器
        document.onselectstart = null;
        document.ondragstart = null;
        document.oncontextmenu = null;
        document.onmousedown = null;
        document.onmouseup = null;
        document.onkeydown = null;
        document.onkeyup = null;
        document.onkeypress = null;
        
        // 移除所有元素的选择限制
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
            // 清除样式属性
            element.style.userSelect = 'text';
            element.style.webkitUserSelect = 'text';
            element.style.mozUserSelect = 'text';
            element.style.msUserSelect = 'text';
            element.style.webkitTouchCallout = 'default';
            
            // 移除HTML属性
            element.removeAttribute('unselectable');
            element.removeAttribute('onselectstart');
            element.removeAttribute('ondragstart');
            element.removeAttribute('oncontextmenu');
            element.removeAttribute('onmousedown');
            element.removeAttribute('onmouseup');
            
            // 清除事件监听器
            element.onselectstart = null;
            element.ondragstart = null;
            element.oncontextmenu = null;
            element.onmousedown = null;
            element.onmouseup = null;
            element.onkeydown = null;
            element.onkeyup = null;
            element.onkeypress = null;
            
            // 移除常见的禁用选择类名
            const disableClasses = ['no-select', 'noselect', 'unselectable', 'disable-select', 'user-select-none'];
            disableClasses.forEach(className => {
                element.classList.remove(className);
            });
        });
        
        // 强制启用文本选择
        enableTextSelectionForBody();
    }
    
    /**
     * 为body强制启用文本选择
     */
    function enableTextSelectionForBody() {
        const body = document.body;
        if (body) {
            // 移除所有可能的禁用属性
            body.removeAttribute('unselectable');
            body.removeAttribute('onselectstart');
            body.removeAttribute('ondragstart');
            
            // 设置允许选择的样式
            body.style.userSelect = 'text';
            body.style.webkitUserSelect = 'text';
            body.style.mozUserSelect = 'text';
            body.style.msUserSelect = 'text';
            
            // 清除事件监听器
            body.onselectstart = null;
            body.ondragstart = null;
            body.oncontextmenu = null;
        }
    }
    
    /**
     * 覆盖Document和Element原型方法
     */
    function overrideDocumentMethods() {
        // 覆盖addEventListener以阻止添加限制选择的事件
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            // 阻止这些事件的监听器添加
            const blockedEvents = ['selectstart', 'dragstart', 'contextmenu'];
            if (blockedEvents.includes(type) && typeof listener === 'function') {
                // 检查监听器是否是限制选择的
                const listenerStr = listener.toString();
                if (listenerStr.includes('false') || listenerStr.includes('preventDefault') || listenerStr.includes('return false')) {
                    console.log('[网页工具-简化版] 阻止添加限制选择的事件监听器:', type);
                    return; // 不添加限制性的事件监听器
                }
            }
            
            return originalAddEventListener.call(this, type, listener, options);
        };
        
        // 覆盖setAttribute方法以阻止设置限制属性
        const originalSetAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name, value) {
            const blockedAttributes = ['onselectstart', 'ondragstart', 'oncontextmenu', 'unselectable'];
            if (blockedAttributes.includes(name)) {
                console.log('[网页工具-简化版] 阻止设置限制选择的属性:', name);
                return; // 不设置限制性属性
            }
            
            return originalSetAttribute.call(this, name, value);
        };
        
        // 覆盖style设置
        const originalStyleSetter = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'style').set;
        if (originalStyleSetter) {
            Object.defineProperty(HTMLElement.prototype, 'style', {
                set: function(value) {
                    if (typeof value === 'string' && value.includes('user-select')) {
                        // 修改user-select为text
                        value = value.replace(/user-select\s*:\s*none/gi, 'user-select: text');
                        value = value.replace(/-webkit-user-select\s*:\s*none/gi, '-webkit-user-select: text');
                        value = value.replace(/-moz-user-select\s*:\s*none/gi, '-moz-user-select: text');
                        value = value.replace(/-ms-user-select\s*:\s*none/gi, '-ms-user-select: text');
                    }
                    return originalStyleSetter.call(this, value);
                }
            });
        }
    }
    
    /**
     * 开始持续监控
     */
    function startContinuousMonitoring() {
        // 使用MutationObserver监控DOM变化
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // 监控新添加的节点
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            removeElementSelectRestrictions(node);
                        }
                    });
                }
                
                // 监控属性变化
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (mutation.attributeName === 'style' || 
                        mutation.attributeName === 'onselectstart' ||
                        mutation.attributeName === 'ondragstart' ||
                        mutation.attributeName === 'unselectable') {
                        removeElementSelectRestrictions(target);
                    }
                }
            });
        });
        
        // 开始观察
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'onselectstart', 'ondragstart', 'unselectable', 'class']
        });
        
        // 定时强制清理
        if (window.websiteToolsCleanInterval) {
            clearInterval(window.websiteToolsCleanInterval);
        }
        
        window.websiteToolsCleanInterval = setInterval(() => {
            removeAllSelectRestrictions();
        }, 2000); // 每2秒强制清理一次
        
        console.log('[网页工具-简化版] 持续监控已启动');
    }
    
    /**
     * 移除单个元素的选择限制
     */
    function removeElementSelectRestrictions(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
        
        // 清除样式
        element.style.userSelect = 'text';
        element.style.webkitUserSelect = 'text';
        element.style.mozUserSelect = 'text';
        element.style.msUserSelect = 'text';
        
        // 清除属性
        element.removeAttribute('unselectable');
        element.removeAttribute('onselectstart');
        element.removeAttribute('ondragstart');
        
        // 清除事件
        element.onselectstart = null;
        element.ondragstart = null;
        
        // 递归处理子元素
        const children = element.querySelectorAll('*');
        children.forEach(child => {
            child.style.userSelect = 'text';
            child.style.webkitUserSelect = 'text';
            child.style.mozUserSelect = 'text';
            child.style.msUserSelect = 'text';
            child.onselectstart = null;
            child.ondragstart = null;
        });
    }
    
    /**
     * 恢复右键菜单 - 增强版
     */
    function restoreRightClick() {
        console.log('[网页工具-简化版] 恢复增强版右键菜单');
        
        rightClickEnabled = true;
        
        // 强力移除所有右键菜单禁用
        removeAllContextMenuRestrictions();
        
        // 覆盖原型方法阻止新的限制
        overrideContextMenuMethods();
        
        // 添加强制右键菜单事件
        addForceContextMenuEvents();
        
        // 添加样式确保右键菜单可用
        addContextMenuStyles();
        
        console.log('[网页工具-简化版] 增强版右键菜单已恢复');
    }
    
    /**
     * 移除所有右键菜单限制
     */
    function removeAllContextMenuRestrictions() {
        // 移除document级别的右键菜单禁用
        document.oncontextmenu = null;
        document.onmousedown = null;
        document.onmouseup = null;
        document.onmousemove = null;
        
        // 移除所有元素的右键菜单禁用
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
            // 清除事件属性
            element.oncontextmenu = null;
            element.onmousedown = null;
            element.onmouseup = null;
            element.onmousemove = null;
            
            // 移除HTML属性
            element.removeAttribute('oncontextmenu');
            element.removeAttribute('onmousedown');
            element.removeAttribute('onmouseup');
            element.removeAttribute('onmousemove');
            
            // 确保pointer-events正常
            if (element.style.pointerEvents === 'none') {
                element.style.pointerEvents = 'auto';
            }
        });
    }
    
    /**
     * 覆盖右键菜单相关方法
     */
    function overrideContextMenuMethods() {
        // 保存原始的addEventListener
        if (!window._originalAddEventListener) {
            window._originalAddEventListener = EventTarget.prototype.addEventListener;
        }
        
        // 覆盖addEventListener以阻止添加右键菜单限制
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (type === 'contextmenu' && typeof listener === 'function') {
                const listenerStr = listener.toString();
                // 检查是否是阻止右键菜单的监听器
                if (listenerStr.includes('preventDefault') || 
                    listenerStr.includes('return false') || 
                    listenerStr.includes('stopPropagation')) {
                    console.log('[网页工具-简化版] 阻止添加右键菜单限制监听器');
                    return; // 不添加限制性的监听器
                }
            }
            
            return window._originalAddEventListener.call(this, type, listener, options);
        };
    }
    
    /**
     * 添加强制右键菜单事件
     */
    function addForceContextMenuEvents() {
        // 移除可能存在的旧监听器
        if (window._websiteToolsContextMenuHandler) {
            document.removeEventListener('contextmenu', window._websiteToolsContextMenuHandler, true);
        }
        
        // 创建强制右键菜单事件处理器
        const forceContextMenuHandler = function(e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            return true;
        };
        
        // 保存引用以便后续移除
        window._websiteToolsContextMenuHandler = forceContextMenuHandler;
        
        // 在捕获阶段添加事件监听器，优先级最高
        document.addEventListener('contextmenu', forceContextMenuHandler, true);
        
        // 阻止鼠标按下事件的默认行为（一些网站在mousedown时就阻止右键）
        const forceMouseDownHandler = function(e) {
            if (e.button === 2) { // 右键
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        };
        
        document.addEventListener('mousedown', forceMouseDownHandler, true);
        
        // 阻止一些网站通过keydown阻止菜单键
        const forceKeyDownHandler = function(e) {
            if (e.key === 'ContextMenu' || e.keyCode === 93) {
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        };
        
        document.addEventListener('keydown', forceKeyDownHandler, true);
    }
    
    /**
     * 添加右键菜单样式
     */
    function addContextMenuStyles() {
        const existingStyle = document.getElementById('website-tools-right-click');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = 'website-tools-right-click';
        style.textContent = `
            * {
                pointer-events: auto !important;
                -webkit-touch-callout: default !important;
            }
            
            /* 确保所有元素都可以右键 */
            body, html, div, span, p, a, img, video, audio {
                pointer-events: auto !important;
            }
            
            /* 移除可能的右键禁用类 */
            .no-contextmenu, .disable-contextmenu, .no-rightclick {
                pointer-events: auto !important;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * 恢复键盘快捷键 - 增强版
     */
    function restoreKeyboardShortcuts() {
        console.log('[网页工具-简化版] 恢复增强版键盘快捷键');
        
        shortcutsEnabled = true;
        
        // 强力移除所有键盘限制
        removeAllKeyboardRestrictions();
        
        // 覆盖键盘事件方法
        overrideKeyboardMethods();
        
        // 添加强制快捷键事件
        addForceKeyboardEvents();
        
        console.log('[网页工具-简化版] 增强版键盘快捷键已恢复');
    }
    
    /**
     * 移除所有键盘限制
     */
    function removeAllKeyboardRestrictions() {
        // 移除document级别的键盘事件监听器
        document.onkeydown = null;
        document.onkeyup = null;
        document.onkeypress = null;
        
        // 移除所有元素的键盘事件禁用
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
            // 清除事件属性
            element.onkeydown = null;
            element.onkeyup = null;
            element.onkeypress = null;
            
            // 移除HTML属性
            element.removeAttribute('onkeydown');
            element.removeAttribute('onkeyup');
            element.removeAttribute('onkeypress');
        });
    }
    
    /**
     * 覆盖键盘事件方法
     */
    function overrideKeyboardMethods() {
        // 保存原始的addEventListener（如果还没保存）
        if (!window._originalAddEventListener) {
            window._originalAddEventListener = EventTarget.prototype.addEventListener;
        }
        
        // 覆盖addEventListener以阻止添加键盘限制
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            const keyboardEvents = ['keydown', 'keyup', 'keypress'];
            if (keyboardEvents.includes(type) && typeof listener === 'function') {
                const listenerStr = listener.toString();
                // 检查是否是阻止常用快捷键的监听器
                if ((listenerStr.includes('preventDefault') || listenerStr.includes('return false')) &&
                    (listenerStr.includes('ctrlKey') || listenerStr.includes('metaKey') || 
                     listenerStr.includes('keyCode') || listenerStr.includes('key'))) {
                    console.log('[网页工具-简化版] 阻止添加键盘限制监听器:', type);
                    return; // 不添加限制性的监听器
                }
            }
            
            // 对于右键菜单事件，也要阻止
            if (type === 'contextmenu' && typeof listener === 'function') {
                const listenerStr = listener.toString();
                if (listenerStr.includes('preventDefault') || 
                    listenerStr.includes('return false') || 
                    listenerStr.includes('stopPropagation')) {
                    console.log('[网页工具-简化版] 阻止添加右键菜单限制监听器');
                    return;
                }
            }
            
            return window._originalAddEventListener.call(this, type, listener, options);
        };
    }
    
    /**
     * 添加强制快捷键事件
     */
    function addForceKeyboardEvents() {
        // 移除可能存在的旧监听器
        if (window._websiteToolsKeyboardHandler) {
            document.removeEventListener('keydown', window._websiteToolsKeyboardHandler, true);
        }
        
        // 创建强制快捷键事件处理器
        const forceKeyboardHandler = function(e) {
            // 允许常用快捷键
            if (e.ctrlKey || e.metaKey) {
                const allowedKeys = ['a', 'c', 'v', 'x', 'z', 'y', 'f', 's', 'p', 'r', 'n', 't', 'w', 'l'];
                if (allowedKeys.includes(e.key.toLowerCase())) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    console.log('[网页工具-简化版] 保护快捷键:', e.key);
                    return true;
                }
            }
            
            // 允许F12开发者工具和其他F键
            if (e.key.startsWith('F') && e.key.length <= 3) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                return true;
            }
            
            // 允许Escape键
            if (e.key === 'Escape') {
                e.stopPropagation();
                e.stopImmediatePropagation();
                return true;
            }
        };
        
        // 保存引用
        window._websiteToolsKeyboardHandler = forceKeyboardHandler;
        
        // 在捕获阶段添加事件监听器，优先级最高
        document.addEventListener('keydown', forceKeyboardHandler, true);
        
        // 也处理keyup和keypress
        const forceKeyHandler = function(e) {
            if (e.ctrlKey || e.metaKey) {
                const allowedKeys = ['a', 'c', 'v', 'x', 'z', 'y', 'f', 's', 'p', 'r', 'n', 't', 'w', 'l'];
                if (allowedKeys.includes(e.key.toLowerCase())) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return true;
                }
            }
        };
        
        document.addEventListener('keyup', forceKeyHandler, true);
        document.addEventListener('keypress', forceKeyHandler, true);
    }
    
    /**
     * 提取页面图片
     */
    function extractImagesFromPage() {
        const images = [];
        
        // 提取img元素
        document.querySelectorAll('img').forEach((img, index) => {
            if (img.src && img.src.startsWith('http')) {
                images.push({
                    id: index + 1,
                    src: img.src,
                    alt: img.alt || '图片',
                    width: img.naturalWidth || img.width || 0,
                    height: img.naturalHeight || img.height || 0,
                    size: 0 // 初始化为0，表示未知大小
                });
            }
        });
        
        // 提取背景图片
        document.querySelectorAll('*').forEach((element, index) => {
            const style = window.getComputedStyle(element);
            const backgroundImage = style.backgroundImage;
            
            if (backgroundImage && backgroundImage !== 'none') {
                const match = backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
                if (match && match[1] && match[1].startsWith('http')) {
                    images.push({
                        id: images.length + 1,
                        src: match[1],
                        alt: '背景图片',
                        width: 0,
                        height: 0,
                        size: 0
                    });
                }
            }
        });
        
        return images;
    }
    
    /**
     * 提取页面视频
     */
    function extractVideosFromPage() {
        const videos = [];
        
        document.querySelectorAll('video').forEach((video, index) => {
            if (video.src || video.querySelector('source')) {
                const src = video.src || video.querySelector('source')?.src;
                if (src) {
                    videos.push({
                        id: index + 1,
                        src: src,
                        duration: video.duration || 0,
                        width: video.videoWidth || video.width || 0,
                        height: video.videoHeight || video.height || 0,
                        size: 0 // 初始化为0，表示未知大小
                    });
                }
            }
        });
        
        return videos;
    }
    
    /**
     * 提取页面音频
     */
    function extractAudioFromPage() {
        const audio = [];
        
        document.querySelectorAll('audio').forEach((audioElement, index) => {
            if (audioElement.src || audioElement.querySelector('source')) {
                const src = audioElement.src || audioElement.querySelector('source')?.src;
                if (src) {
                    audio.push({
                        id: index + 1,
                        src: src,
                        duration: audioElement.duration || 0,
                        size: 0 // 初始化为0，表示未知大小
                    });
                }
            }
        });
        
        return audio;
    }
    
    /**
     * 启用新标签页模式 - 增强版
     */
    function enableNewTabMode(enabled = true) {
        console.log('[网页工具-简化版] 设置增强版新标签页模式:', enabled);
        
        if (enabled) {
            newTabMode = true;
            
            // 添加外部链接样式
            addLinkStyles();
            
            // 标记外部链接
            markExternalLinks();
            
            // 添加多层次点击事件监听器（不清除其他模式）
            addMultipleClickHandlers();
            
            console.log('[网页工具-简化版] 增强版新标签页模式已启用');
        } else {
            newTabMode = false;
            removeLinkStyles();
            // 移除新标签页相关的事件监听器
            if (window._websiteToolsClickHandler) {
                document.removeEventListener('click', window._websiteToolsClickHandler, true);
                document.removeEventListener('click', window._websiteToolsClickHandler, false);
                window._websiteToolsClickHandler = null;
            }
            // 清除外部链接标记
            document.querySelectorAll('.website-tools-external').forEach(link => {
                link.classList.remove('website-tools-external');
            });
            console.log('[网页工具-简化版] 新标签页模式已禁用');
        }
    }
    
    /**
     * 添加多层次点击事件处理器
     */
    function addMultipleClickHandlers() {
        // 移除可能存在的旧监听器
        if (window._websiteToolsClickHandler) {
            document.removeEventListener('click', window._websiteToolsClickHandler, true);
            document.removeEventListener('click', window._websiteToolsClickHandler, false);
        }
        
        // 创建增强的点击处理器
        const enhancedClickHandler = function(e) {
            console.log('[网页工具-简化版] 检测到点击事件:', e.target);
            
            // 查找最近的链接元素
            const link = e.target.closest('a[href]');
            if (!link) {
                console.log('[网页工具-简化版] 未找到链接元素');
                return;
            }
            
            console.log('[网页工具-简化版] 找到链接:', link.href);
            console.log('[网页工具-简化版] 链接类名:', link.className);
            console.log('[网页工具-简化版] 是否为外部链接:', link.classList.contains('website-tools-external'));
            
            // 检查是否为外部链接
            if (link.classList.contains('website-tools-external')) {
                console.log('[网页工具-简化版] 拦截外部链接点击:', link.href);
                
                // 强力阻止默认行为
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                // 延迟执行，确保阻止了所有事件
                setTimeout(() => {
                    console.log('[网页工具-简化版] 在新标签页打开:', link.href);
                    window.open(link.href, '_blank', 'noopener,noreferrer');
                }, 10);
                
                return false;
            } else {
                console.log('[网页工具-简化版] 内部链接，允许正常处理');
            }
        };
        
        // 保存引用
        window._websiteToolsClickHandler = enhancedClickHandler;
        
        // 在捕获和冒泡阶段都添加监听器
        document.addEventListener('click', enhancedClickHandler, true);  // 捕获阶段
        document.addEventListener('click', enhancedClickHandler, false); // 冒泡阶段
        
        // 添加mousedown事件作为备用
        const mousedownHandler = function(e) {
            if (e.button === 0) { // 左键
                const link = e.target.closest('a[href]');
                if (link && link.classList.contains('website-tools-external')) {
                    console.log('[网页工具-简化版] mousedown拦截外部链接:', link.href);
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            }
        };
        
        document.addEventListener('mousedown', mousedownHandler, true);
        
        // 覆盖可能存在的链接点击处理
        overrideLinkBehavior();
        
        console.log('[网页工具-简化版] 多层次点击处理器已添加');
    }
    
    /**
     * 覆盖链接默认行为
     */
    function overrideLinkBehavior() {
        // 查找所有外部链接并直接修改行为
        const externalLinks = document.querySelectorAll('.website-tools-external');
        console.log('[网页工具-简化版] 发现外部链接数量:', externalLinks.length);
        
        externalLinks.forEach((link, index) => {
            // 移除可能的现有点击事件
            link.onclick = null;
            
            // 添加直接的点击处理
            link.addEventListener('click', function(e) {
                console.log('[网页工具-简化版] 直接链接点击处理:', this.href);
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                window.open(this.href, '_blank', 'noopener,noreferrer');
                return false;
            }, true);
            
            // 也添加mousedown处理
            link.addEventListener('mousedown', function(e) {
                if (e.button === 0) { // 左键
                    console.log('[网页工具-简化版] 直接链接mousedown处理:', this.href);
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            }, true);
            
            if (index < 3) { // 只打印前3个链接的信息
                console.log('[网页工具-简化版] 已处理外部链接:', link.href);
            }
        });
    }
    
    /**
     * 启用预览模式
     */
    function enablePreviewMode(enabled = true) {
        console.log('[网页工具-简化版] 设置预览模式:', enabled);
        
        if (enabled) {
            previewMode = true;
            
            // 添加预览样式
            addPreviewStyles();
            
            // 标记所有链接
            markAllLinksForPreview();
            
            // 添加鼠标事件监听器
            addPreviewEventListeners();
            
            console.log('[网页工具-简化版] 预览模式已启用');
        } else {
            previewMode = false;
            removePreviewStyles();
            removePreviewEventListeners();
            // 清除预览链接标记
            document.querySelectorAll('.website-tools-preview').forEach(link => {
                link.classList.remove('website-tools-preview');
            });
            console.log('[网页工具-简化版] 预览模式已禁用');
        }
    }
    
    /**
     * 添加链接样式
     */
    function addLinkStyles() {
        if (document.getElementById('website-tools-link-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'website-tools-link-styles';
        style.textContent = `
            .website-tools-external {
                position: relative;
            }
            .website-tools-external::after {
                content: "↗";
                font-size: 0.8em;
                color: #007bff;
                margin-left: 3px;
                opacity: 0.8;
            }
            .website-tools-external:hover::after {
                opacity: 1;
                color: #0056b3;
            }
            
            .website-tools-internal {
                position: relative;
            }
            .website-tools-internal::after {
                content: "🔗";
                font-size: 0.8em;
                color: #28a745;
                margin-left: 3px;
                opacity: 0.8;
            }
            .website-tools-internal:hover::after {
                opacity: 1;
                color: #1e7e34;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * 移除链接样式
     */
    function removeLinkStyles() {
        const style = document.getElementById('website-tools-link-styles');
        if (style) style.remove();
    }
    
    /**
     * 标记外部链接
     */
    function markExternalLinks() {
        const currentDomain = window.location.hostname;
        const links = document.querySelectorAll('a[href]');
        let externalCount = 0;
        
        console.log('[网页工具-简化版] 当前域名:', currentDomain);
        console.log('[网页工具-简化版] 找到链接总数:', links.length);
        
        links.forEach((link, index) => {
            try {
                const url = new URL(link.href);
                if (url.hostname !== currentDomain) {
                    link.classList.add('website-tools-external');
                    externalCount++;
                    if (index < 5) { // 只打印前5个作为示例
                        console.log('[网页工具-简化版] 外部链接示例:', url.hostname, '!=', currentDomain, '→', link.href);
                    }
                }
            } catch (e) {
                // 忽略无效链接
                console.warn('[网页工具-简化版] 无效链接:', link.href);
            }
        });
        
        console.log('[网页工具-简化版] 已标记外部链接:', externalCount, '个');
    }
    
    /**
     * 添加预览样式
     */
    function addPreviewStyles() {
        if (document.getElementById('website-tools-preview-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'website-tools-preview-styles';
        style.textContent = `
            .website-tools-preview {
                border-bottom: 1px dotted #007bff !important;
                position: relative;
            }
            .website-tools-preview:hover {
                border-bottom-color: #0056b3 !important;
            }
            .website-tools-preview:hover::after {
                content: attr(href);
                position: absolute;
                bottom: 100%;
                left: 0;
                background: #333;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                white-space: nowrap;
                z-index: 1000;
                max-width: 300px;
                overflow: hidden;
                text-overflow: ellipsis;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * 移除预览样式
     */
    function removePreviewStyles() {
        const style = document.getElementById('website-tools-preview-styles');
        if (style) style.remove();
    }
    
    /**
     * 标记所有链接用于预览
     */
    function markAllLinksForPreview() {
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
            link.classList.add('website-tools-preview');
        });
        
        console.log('[网页工具-简化版] 已标记所有链接用于预览');
    }
    
    /**
     * 添加预览事件监听器
     */
    function addPreviewEventListeners() {
        document.addEventListener('mouseenter', handleLinkHover, true);
        document.addEventListener('mouseleave', handleLinkLeave, true);
        console.log('[网页工具-简化版] 预览事件监听器已添加');
    }
    
    /**
     * 移除预览事件监听器
     */
    function removePreviewEventListeners() {
        document.removeEventListener('mouseenter', handleLinkHover, true);
        document.removeEventListener('mouseleave', handleLinkLeave, true);
        // 移除所有预览框
        document.querySelectorAll('.website-tools-preview-tooltip').forEach(el => el.remove());
        console.log('[网页工具-简化版] 预览事件监听器已移除');
    }
    
    /**
     * 处理链接悬停
     */
    function handleLinkHover(e) {
        const link = e.target.closest('a[href]');
        if (!link || !link.classList.contains('website-tools-preview')) return;
        
        showLinkPreview(link, e);
    }
    
    /**
     * 处理链接离开
     */
    function handleLinkLeave(e) {
        const link = e.target.closest('a[href]');
        if (!link || !link.classList.contains('website-tools-preview')) return;
        
        hideLinkPreview(link);
    }
    
    /**
     * 显示链接预览
     */
    function showLinkPreview(link, event) {
        // 移除现有预览
        hideLinkPreview();
        
        // 创建预览框
        const preview = document.createElement('div');
        preview.className = 'website-tools-preview-tooltip';
        
        const isExternal = link.hostname !== window.location.hostname;
        const linkText = link.textContent.trim() || '无标题链接';
        
        preview.innerHTML = `
            <div style="font-weight: bold; color: ${isExternal ? '#ff6b35' : '#007bff'}; margin-bottom: 4px;">
                ${isExternal ? '🔗 外部链接' : '🏠 内部链接'}
            </div>
            <div style="font-size: 12px; margin-bottom: 4px; color: #333;">
                ${linkText.length > 40 ? linkText.substring(0, 37) + '...' : linkText}
            </div>
            <div style="font-size: 11px; color: #666; word-break: break-all;">
                ${link.href}
            </div>
        `;
        
        // 设置样式
        Object.assign(preview.style, {
            position: 'fixed',
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            zIndex: '999999',
            maxWidth: '320px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            pointerEvents: 'none',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            lineHeight: '1.4'
        });
        
        document.body.appendChild(preview);
        
        // 定位预览框
        const rect = link.getBoundingClientRect();
        const previewRect = preview.getBoundingClientRect();
        
        let left = rect.left;
        let top = rect.bottom + 8;
        
        // 防止超出视窗
        if (left + previewRect.width > window.innerWidth) {
            left = window.innerWidth - previewRect.width - 10;
        }
        if (left < 10) left = 10;
        
        if (top + previewRect.height > window.innerHeight) {
            top = rect.top - previewRect.height - 8;
        }
        if (top < 10) top = rect.bottom + 8;
        
        preview.style.left = left + 'px';
        preview.style.top = top + 'px';
        
        // 存储引用
        link._websiteToolsPreview = preview;
        
        console.log('[网页工具-简化版] 显示链接预览:', link.href);
    }
    
    /**
     * 隐藏链接预览
     */
    function hideLinkPreview(link = null) {
        if (link && link._websiteToolsPreview) {
            link._websiteToolsPreview.remove();
            delete link._websiteToolsPreview;
        } else {
            // 清理所有预览
            document.querySelectorAll('.website-tools-preview-tooltip').forEach(el => el.remove());
        }
    }
    
    console.log('[网页工具-简化版] 消息监听器设置完成');
    console.log('[网页工具-简化版] Content Script 初始化完成');
    
    /**
     * 专门针对飞书的特殊处理
     */
    function enableFeishuSpecialHandling() {
        console.log('[网页工具-简化版] 启用飞书特殊处理');
        
        // 飞书可能使用的特殊类名和选择器
        const feishuSelectors = [
            '.docs-reader',
            '.docs-editor',
            '.lark-docs',
            '.doc-content',
            '.text-content',
            '[data-testid="doc-content"]',
            '.suite-markdown-container',
            '.rich-text-container'
        ];
        
        // 强制启用这些元素的文本选择
        feishuSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.userSelect = 'text !important';
                element.style.webkitUserSelect = 'text !important';
                element.style.mozUserSelect = 'text !important';
                element.style.msUserSelect = 'text !important';
                
                // 移除所有可能的事件监听器
                element.onselectstart = null;
                element.ondragstart = null;
                element.oncontextmenu = null;
                element.onmousedown = null;
                element.onmouseup = null;
                
                // 移除禁用属性
                element.removeAttribute('unselectable');
                element.removeAttribute('onselectstart');
                element.removeAttribute('ondragstart');
            });
        });
        
        // 特殊CSS覆盖飞书的限制
        const feishuStyle = document.createElement('style');
        feishuStyle.id = 'website-tools-feishu-special';
        feishuStyle.textContent = `
            /* 飞书特殊处理 */
            .docs-reader *, .docs-editor *, .lark-docs *, .doc-content *,
            .text-content *, [data-testid="doc-content"] *,
            .suite-markdown-container *, .rich-text-container * {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                -webkit-touch-callout: default !important;
            }
            
            /* 覆盖飞书可能的内联样式 */
            [style*="user-select: none"] {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
            
            /* 确保指针事件正常 */
            .docs-reader, .docs-editor, .lark-docs, .doc-content,
            .text-content, [data-testid="doc-content"],
            .suite-markdown-container, .rich-text-container {
                pointer-events: auto !important;
            }
        `;
        
        document.head.appendChild(feishuStyle);
        
        // 覆盖飞书可能使用的全局函数
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
                        getRangeAt: () => null
                    };
                }
            };
        }
        
        // 监控飞书可能动态添加的限制
        const feishuObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 对新添加的节点也应用解锁
                            feishuSelectors.forEach(selector => {
                                if (node.matches && node.matches(selector)) {
                                    removeElementSelectRestrictions(node);
                                }
                                const children = node.querySelectorAll(selector);
                                children.forEach(child => {
                                    removeElementSelectRestrictions(child);
                                });
                            });
                        }
                    });
                }
            });
        });
        
        feishuObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // 定时强制清理飞书限制
        setInterval(() => {
            feishuSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    removeElementSelectRestrictions(element);
                });
            });
        }, 1000); // 每秒清理一次
        
        console.log('[网页工具-简化版] 飞书特殊处理已启用');
    }
    
    /**
     * 调试工具：检查链接处理状态
     */
    function debugLinkHandling() {
        console.log('=== 链接处理调试信息 ===');
        console.log('新标签页模式:', newTabMode);
        console.log('预览模式:', previewMode);
        
        const allLinks = document.querySelectorAll('a[href]');
        const externalLinks = document.querySelectorAll('.website-tools-external');
        
        console.log('总链接数:', allLinks.length);
        console.log('外部链接数:', externalLinks.length);
        
        // 检查前几个外部链接的状态
        externalLinks.forEach((link, index) => {
            if (index < 5) {
                console.log(`外部链接 ${index + 1}:`, {
                    href: link.href,
                    hostname: new URL(link.href).hostname,
                    className: link.className,
                    hasExternalClass: link.classList.contains('website-tools-external'),
                    onclick: link.onclick ? '有onclick' : '无onclick',
                    listeners: '检查开发者工具Event Listeners'
                });
            }
        });
        
        console.log('=== 调试信息结束 ===');
    }
    
    // 将调试函数暴露到全局
    window.debugWebsiteTools = debugLinkHandling;

    /**
     * 启用Target属性模式 - 直接修改链接的target属性
     */
    function enableTargetBlankMode(enabled = true) {
        console.log('[网页工具-简化版] 设置Target属性模式:', enabled);
        
        if (enabled) {
            // 添加外部链接样式
            addLinkStyles();
            
            // 标记所有链接并设置target属性
            markAllLinksWithTarget();
            
            // 监听DOM变化，处理动态添加的链接
            startTargetBlankObserver();
            
            console.log('[网页工具-简化版] Target属性模式已启用');
        } else {
            // 移除target属性
            removeTargetBlankFromLinks();
            
            // 停止DOM监听
            stopTargetBlankObserver();
            
            // 移除样式
            removeLinkStyles();
            
            console.log('[网页工具-简化版] Target属性模式已禁用');
        }
    }
    
    /**
     * 标记所有链接并设置target属性
     */
    function markAllLinksWithTarget() {
        const currentDomain = window.location.hostname;
        const links = document.querySelectorAll('a[href]');
        let externalCount = 0;
        let internalCount = 0;
        
        links.forEach(link => {
            try {
                const url = new URL(link.href);
                const isExternal = url.hostname !== currentDomain;
                
                // 处理所有链接，不仅仅是外部链接
                if (isExternal) {
                    // 添加外部链接标识
                    link.classList.add('website-tools-external');
                    externalCount++;
                } else {
                    // 添加内部链接标识
                    link.classList.add('website-tools-internal');
                    internalCount++;
                }
                
                // 为所有链接添加target="_blank"属性
                // 保存原有的target属性
                if (link.hasAttribute('target')) {
                    link.setAttribute('data-original-target', link.getAttribute('target'));
                }
                
                // 保存原有的rel属性
                if (link.hasAttribute('rel')) {
                    link.setAttribute('data-original-rel', link.getAttribute('rel'));
                }
                
                // 设置target属性
                link.setAttribute('target', '_blank');
                
                // 为外部链接添加安全属性
                if (isExternal) {
                    const existingRel = link.getAttribute('rel') || '';
                    const relParts = existingRel.split(' ').filter(part => part.trim());
                    if (!relParts.includes('noopener')) relParts.push('noopener');
                    if (!relParts.includes('noreferrer')) relParts.push('noreferrer');
                    link.setAttribute('rel', relParts.join(' '));
                }
                
            } catch (e) {
                // 忽略无效URL
            }
        });
        
        console.log('[网页工具-简化版] Target模式处理了', externalCount, '个外部链接和', internalCount, '个内部链接');
    }
    
    /**
     * 移除所有链接的target属性
     */
    function removeTargetBlankFromLinks() {
        // 处理外部链接和内部链接
        const externalLinks = document.querySelectorAll('a.website-tools-external');
        const internalLinks = document.querySelectorAll('a.website-tools-internal');
        const allProcessedLinks = [...externalLinks, ...internalLinks];
        
        allProcessedLinks.forEach(link => {
            // 移除target属性（如果原来没有的话）
            if (!link.hasAttribute('data-original-target')) {
                link.removeAttribute('target');
            } else {
                // 恢复原来的target值
                const originalTarget = link.getAttribute('data-original-target');
                if (originalTarget) {
                    link.setAttribute('target', originalTarget);
                } else {
                    link.removeAttribute('target');
                }
                link.removeAttribute('data-original-target');
            }
            
            // 移除rel属性（如果原来没有的话）
            if (!link.hasAttribute('data-original-rel')) {
                link.removeAttribute('rel');
            } else {
                // 恢复原来的rel值
                const originalRel = link.getAttribute('data-original-rel');
                if (originalRel) {
                    link.setAttribute('rel', originalRel);
                } else {
                    link.removeAttribute('rel');
                }
                link.removeAttribute('data-original-rel');
            }
            
            // 移除链接标识
            link.classList.remove('website-tools-external');
            link.classList.remove('website-tools-internal');
        });
        
        console.log('[网页工具-简化版] 已移除所有Target属性设置，处理了', allProcessedLinks.length, '个链接');
    }
    
    /**
     * 开始监听DOM变化，处理动态添加的链接
     */
    function startTargetBlankObserver() {
        // 如果已经存在观察器，先停止
        stopTargetBlankObserver();
        
        window._websiteToolsTargetObserver = new MutationObserver((mutations) => {
            let hasNewLinks = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 检查新添加的节点是否是链接或包含链接
                            if (node.tagName === 'A' && node.href) {
                                hasNewLinks = true;
                            } else if (node.querySelectorAll) {
                                const newLinks = node.querySelectorAll('a[href]');
                                if (newLinks.length > 0) {
                                    hasNewLinks = true;
                                }
                            }
                        }
                    });
                }
            });
            
            // 如果发现新链接，重新处理
            if (hasNewLinks) {
                console.log('[网页工具-简化版] 检测到新链接，重新应用Target属性');
                markAllLinksWithTarget();
            }
        });
        
        // 开始观察
        window._websiteToolsTargetObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('[网页工具-简化版] Target属性DOM观察器已启动');
    }
    
    /**
     * 停止DOM观察器
     */
    function stopTargetBlankObserver() {
        if (window._websiteToolsTargetObserver) {
            window._websiteToolsTargetObserver.disconnect();
            window._websiteToolsTargetObserver = null;
            console.log('[网页工具-简化版] Target属性DOM观察器已停止');
        }
    }
} 