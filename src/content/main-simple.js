/**
 * 简化版content script - 用于测试消息通信
 */

console.log('[网页工具-简化版] Content Script 开始加载');
console.log('[网页工具-简化版] 当前URL:', window.location.href);
console.log('[网页工具-简化版] 当前时间:', new Date().toISOString());

// 防止重复注入，但允许重新初始化
if (window.websiteToolsSimpleInjected) {
    console.log('[网页工具-简化版] 检测到重复注入，重新初始化...');
    // 清理旧的监听器
    if (window.websiteToolsCleanup) {
        window.websiteToolsCleanup();
    }
} else {
    console.log('[网页工具-简化版] 首次注入，开始初始化...');
}

window.websiteToolsSimpleInjected = true;

// 功能状态
let newTabMode = false;
let previewMode = false;
let currentLinkHandler = null;
let rightClickEnabled = false;
let shortcutsEnabled = false;

// 清理函数数组
const cleanupFunctions = [];

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
    cleanupFunctions.push(() => {
        document.removeEventListener('DOMContentLoaded', initializeExtension);
    });
} else {
    // 如果DOM已经加载完成，延迟一点时间确保页面稳定
    setTimeout(initializeExtension, 100);
}

/**
 * 监听配置变化，自动应用新设置
 */
const storageChangeListener = (changes, namespace) => {
    if (namespace === 'sync' && changes.websiteToolsSettings) {
        const newSettings = changes.websiteToolsSettings.newValue || {};
        console.log('[网页工具-简化版] 配置发生变化，重新应用设置:', newSettings);
        
        // 重新初始化功能
        initializeExtension();
    }
};

chrome.storage.onChanged.addListener(storageChangeListener);
cleanupFunctions.push(() => {
    chrome.storage.onChanged.removeListener(storageChangeListener);
});

console.log('[网页工具-简化版] 配置监听器已设置');

// 设置消息监听器
const messageListener = (request, sender, sendResponse) => {
    console.log('[网页工具-简化版] 收到消息:', request);
    
    try {
        const { type, data } = request;
        
        switch (type) {
            case 'PING':
                // 连接检测响应
                sendResponse({ pong: true, timestamp: Date.now() });
                break;
                
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
                    timestamp: Date.now(),
                    injected: true // 标记Content Script已注入
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
                
            case 'DISABLE_TEXT_SELECTION':
            case 'disableTextSelection':
                disableTextSelection();
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
};

chrome.runtime.onMessage.addListener(messageListener);
cleanupFunctions.push(() => {
    chrome.runtime.onMessage.removeListener(messageListener);
});

console.log('[网页工具-简化版] 消息监听器设置完成');
console.log('[网页工具-简化版] Content Script 初始化完成');

/**
 * 专门针对飞书的特殊处理
 */
function enableFeishuSpecialHandling() {
    console.log('[网页工具-简化版] 启用飞书特殊处理');
    
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
    feishuSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            // 强制设置样式
            element.style.userSelect = 'text';
            element.style.webkitUserSelect = 'text';
            element.style.mozUserSelect = 'text';
            element.style.msUserSelect = 'text';
            element.style.pointerEvents = 'auto';
            element.style.cursor = 'text';
            
            // 移除所有可能的事件监听器
            element.onselectstart = null;
            element.ondragstart = null;
            element.oncontextmenu = null;
            element.onmousedown = null;
            element.onmouseup = null;
            element.oncopy = null;
            element.oncut = null;
            element.onpaste = null;
            
            // 移除禁用属性
            element.removeAttribute('unselectable');
            element.removeAttribute('onselectstart');
            element.removeAttribute('ondragstart');
            element.removeAttribute('oncontextmenu');
        });
    });
    
    // 特殊CSS覆盖飞书的限制 - 更强力的样式
    const feishuStyle = document.createElement('style');
    feishuStyle.id = 'website-tools-feishu-special';
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
        
        /* 特别针对飞书元素的强制覆盖 */
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
    }
    
    // 覆盖飞书可能使用的全局函数
    if (window.getSelection) {
        const originalGetSelection = window.getSelection;
        window.getSelection = function() {
            try {
                return originalGetSelection.call(this);
            } catch (e) {
                console.log('[飞书修复] getSelection被拦截，返回模拟对象');
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
                };
            }
        };
    }
    
    // 保护execCommand
    if (document.execCommand) {
        const originalExecCommand = document.execCommand;
        document.execCommand = function(command, showUI, value) {
            try {
                return originalExecCommand.call(this, command, showUI, value);
            } catch (e) {
                console.log(`[飞书修复] execCommand被拦截: ${command}`);
                return true;
            }
        };
    }
    
    // 拦截限制性事件
    const restrictiveEvents = [
        'selectstart', 'dragstart', 'contextmenu', 'copy', 'cut', 'paste',
        'mousedown', 'mouseup', 'keydown', 'keyup', 'keypress'
    ];
    
    restrictiveEvents.forEach(eventType => {
        document.addEventListener(eventType, function(e) {
            // 检查是否在飞书相关元素中
            const target = e.target;
            const isFeishuElement = feishuSelectors.some(selector => {
                try {
                    return target.closest(selector) !== null;
                } catch (e) {
                    return false;
                }
            });
            
            if (isFeishuElement) {
                console.log(`[飞书修复] 拦截并允许事件: ${eventType}`);
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                // 对于复制相关事件，允许默认行为
                if (['copy', 'cut', 'paste', 'selectstart', 'mousedown', 'mouseup'].includes(eventType)) {
                    return true;
                }
            }
        }, true); // 使用capture模式确保优先执行
    });
    
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
            } else if (mutation.type === 'attributes') {
                const target = mutation.target;
                const isFeishuElement = feishuSelectors.some(selector => {
                    try {
                        return target.closest(selector) !== null;
                    } catch (e) {
                        return false;
                    }
                });
                
                if (isFeishuElement) {
                    // 立即解锁新的限制
                    removeElementSelectRestrictions(target);
                }
            }
        });
    });
    
    feishuObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'unselectable', 'onselectstart', 'ondragstart', 'oncontextmenu']
    });
    
    // 定时强制清理飞书限制 - 更频繁
    setInterval(() => {
        feishuSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                removeElementSelectRestrictions(element);
            });
        });
        
        // 清除document和body级别的限制
        document.onselectstart = null;
        document.oncontextmenu = null;
        if (document.body) {
            document.body.onselectstart = null;
            document.body.oncontextmenu = null;
        }
    }, 500); // 每500毫秒清理一次，更频繁
    
    // 强制启用contentEditable模式
    setTimeout(() => {
        feishuSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.contentEditable = 'true';
                element.style.outline = 'none';
                
                // 立即关闭编辑模式，只是为了触发可选择状态
                setTimeout(() => {
                    element.contentEditable = 'false';
                }, 100);
            });
        });
    }, 1000);
    
    console.log('[网页工具-简化版] 飞书特殊处理已启用 - 超强力模式');
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

/**
 * 完整的清理函数
 */
function cleanup() {
    console.log('[网页工具-简化版] 开始清理...');
    
    // 清理所有注册的清理函数
    cleanupFunctions.forEach(fn => {
        try {
            fn();
        } catch (error) {
            console.warn('[网页工具-简化版] 清理函数执行失败:', error);
        }
    });
    cleanupFunctions.length = 0;
    
    // 清理DOM观察器
    stopTargetBlankObserver();
    
    // 清理定时器
    if (window.websiteToolsCleanInterval) {
        clearInterval(window.websiteToolsCleanInterval);
        window.websiteToolsCleanInterval = null;
    }
    
    // 清理事件监听器
    if (window._websiteToolsClickHandler) {
        document.removeEventListener('click', window._websiteToolsClickHandler, true);
        document.removeEventListener('click', window._websiteToolsClickHandler, false);
        window._websiteToolsClickHandler = null;
    }
    
    if (window._websiteToolsContextMenuHandler) {
        document.removeEventListener('contextmenu', window._websiteToolsContextMenuHandler, true);
        window._websiteToolsContextMenuHandler = null;
    }
    
    if (window._websiteToolsKeyboardHandler) {
        document.removeEventListener('keydown', window._websiteToolsKeyboardHandler, true);
        window._websiteToolsKeyboardHandler = null;
    }
    
    // 清理样式
    const stylesToRemove = [
        'website-tools-text-selection',
        'website-tools-right-click',
        'website-tools-link-styles',
        'website-tools-preview-styles',
        'website-tools-feishu-special'
    ];
    
    stylesToRemove.forEach(id => {
        const style = document.getElementById(id);
        if (style) {
            style.remove();
        }
    });
    
    console.log('[网页工具-简化版] 清理完成');
}

// 设置全局清理函数
window.websiteToolsCleanup = cleanup;

// 添加消息监听器
chrome.runtime.onMessage.addListener(messageListener);
cleanupFunctions.push(() => {
    chrome.runtime.onMessage.removeListener(messageListener);
});

// 在页面卸载时清理
window.addEventListener('beforeunload', cleanup);
cleanupFunctions.push(() => {
    window.removeEventListener('beforeunload', cleanup);
});

// 在页面隐藏时也进行部分清理
window.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('[网页工具-简化版] 页面隐藏，进行部分清理');
        // 只清理一些资源密集的功能，不完全清理
        if (window.websiteToolsCleanInterval) {
            clearInterval(window.websiteToolsCleanInterval);
            window.websiteToolsCleanInterval = null;
        }
    }
});

console.log('[网页工具-简化版] 消息监听器设置完成');
console.log('[网页工具-简化版] Content Script 初始化完成');

// 发送就绪信号给background script
try {
    chrome.runtime.sendMessage({
        type: 'CONTENT_SCRIPT_READY',
        data: {
            url: window.location.href,
            timestamp: Date.now(),
            injected: true
        }
    });
    console.log('[网页工具-简化版] 就绪信号已发送');
} catch (error) {
    console.warn('[网页工具-简化版] 发送就绪信号失败:', error);
}

// 将调试函数暴露到全局
window.debugWebsiteTools = debugLinkHandling;

// 标记初始化完成
window.websiteToolsInitialized = true;
console.log('[网页工具-简化版] 所有初始化完成，扩展已就绪');

/**
 * 启用文本选择
 */
function enableTextSelection() {
    console.log('[网页工具-简化版] 启用文本选择');
    
    // 移除现有的样式
    const existingStyle = document.getElementById('website-tools-text-selection');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    // 创建智能CSS样式
    const style = document.createElement('style');
    style.id = 'website-tools-text-selection';
    style.textContent = `
        /* 智能启用文本选择 - 只针对文本内容元素 */
        p, div, span, h1, h2, h3, h4, h5, h6, 
        article, section, main, aside, 
        blockquote, pre, code, 
        li, td, th, dt, dd,
        .text, .content, .article, .post, .description,
        [class*="text"], [class*="content"], [class*="article"] {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: default !important;
        }
        
        /* 覆盖被禁用的文本元素 */
        [style*="user-select: none"] p,
        [style*="user-select: none"] div,
        [style*="user-select: none"] span,
        [style*="user-select:none"] p,
        [style*="user-select:none"] div,
        [style*="user-select:none"] span,
        [style*="-webkit-user-select: none"] p,
        [style*="-webkit-user-select: none"] div,
        [style*="-webkit-user-select: none"] span,
        [style*="-webkit-user-select:none"] p,
        [style*="-webkit-user-select:none"] div,
        [style*="-webkit-user-select:none"] span {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
        
        /* 特别处理被明确禁用的元素 */
        [unselectable="on"] {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            user-select: text !important;
        }
        
        /* 确保按钮、输入框等保持原有行为 */
        button, input, select, textarea, 
        [role="button"], [type="button"], [type="submit"], [type="reset"],
        .btn, .button, [class*="btn"], [class*="button"] {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
        }
        
        /* 输入框应该允许文本选择 */
        input[type="text"], input[type="email"], input[type="password"], 
        input[type="search"], input[type="url"], textarea {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
        
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
    `;
    
    document.head.appendChild(style);
    
    // 只对文本相关元素移除选择限制
    const textElements = document.querySelectorAll(`
        p, div, span, h1, h2, h3, h4, h5, h6, 
        article, section, main, aside, 
        blockquote, pre, code, 
        li, td, th, dt, dd,
        .text, .content, .article, .post, .description,
        [class*="text"], [class*="content"], [class*="article"],
        .docs-reader, .docs-editor, .lark-docs, .doc-content,
        .text-content, [data-testid="doc-content"],
        .suite-markdown-container, .rich-text-container
    `);
    
    textElements.forEach(element => {
        removeElementSelectRestrictions(element);
    });
    
    // 移除document级别的事件监听器
    document.onselectstart = null;
    document.ondragstart = null;
    
    console.log('[网页工具-简化版] 智能文本选择已启用，处理了', textElements.length, '个文本元素');
}

/**
 * 禁用文本选择
 */
function disableTextSelection() {
    console.log('[网页工具-简化版] 禁用文本选择');
    
    // 移除注入的样式
    const existingStyle = document.getElementById('website-tools-text-selection');
    if (existingStyle) {
        existingStyle.remove();
        console.log('[网页工具-简化版] 已移除文本选择样式');
    }
    
    // 刷新页面以完全恢复原始状态
    console.log('[网页工具-简化版] 文本选择已禁用');
}

/**
 * 恢复右键菜单
 */
function restoreRightClick() {
    console.log('[网页工具-简化版] 恢复右键菜单');
    
    // 移除document级别的右键限制
    document.oncontextmenu = null;
    document.body.oncontextmenu = null;
    
    // 移除所有元素的右键限制
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
        element.oncontextmenu = null;
        element.removeAttribute('oncontextmenu');
    });
    
    // 创建CSS样式确保右键菜单可用
    const existingStyle = document.getElementById('website-tools-right-click');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'website-tools-right-click';
    style.textContent = `
        /* 确保右键菜单可用 */
        * {
            pointer-events: auto !important;
        }
    `;
    
    document.head.appendChild(style);
    
    rightClickEnabled = true;
    console.log('[网页工具-简化版] 右键菜单已恢复');
}

/**
 * 恢复键盘快捷键
 */
function restoreKeyboardShortcuts() {
    console.log('[网页工具-简化版] 恢复键盘快捷键');
    
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
        element.onkeydown = null;
        element.onkeyup = null;
        element.onkeypress = null;
        element.removeAttribute('onkeydown');
        element.removeAttribute('onkeyup');
        element.removeAttribute('onkeypress');
    });
    
    shortcutsEnabled = true;
    console.log('[网页工具-简化版] 键盘快捷键已恢复');
}

/**
 * 移除元素的选择限制
 */
function removeElementSelectRestrictions(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        return;
    }
    
    // 移除CSS样式限制
    element.style.userSelect = 'text';
    element.style.webkitUserSelect = 'text';
    element.style.mozUserSelect = 'text';
    element.style.msUserSelect = 'text';
    element.style.webkitTouchCallout = 'default';
    
    // 移除HTML属性限制
    element.removeAttribute('unselectable');
    element.removeAttribute('onselectstart');
    element.removeAttribute('ondragstart');
    element.removeAttribute('oncontextmenu');
    element.removeAttribute('onmousedown');
    
    // 清除JavaScript属性
    element.onselectstart = null;
    element.ondragstart = null;
    element.oncontextmenu = null;
    element.onmousedown = null;
}

/**
 * 提取页面图片
 */
function extractImagesFromPage() {
    console.log('[网页工具-简化版] 开始提取页面图片');
    
    const images = [];
    const seenUrls = new Set();
    
    // 提取img标签
    const imgElements = document.querySelectorAll('img');
    imgElements.forEach((img, index) => {
        const src = img.src || img.dataset.src || img.dataset.original;
        if (src && !seenUrls.has(src)) {
            seenUrls.add(src);
            images.push({
                type: 'image',
                src: src,
                alt: img.alt || '',
                width: img.naturalWidth || img.width || 0,
                height: img.naturalHeight || img.height || 0,
                size: 0, // 无法直接获取文件大小
                index: index
            });
        }
    });
    
    // 提取CSS背景图片
    const allElements = document.querySelectorAll('*');
    allElements.forEach((element, index) => {
        const style = window.getComputedStyle(element);
        const backgroundImage = style.backgroundImage;
        
        if (backgroundImage && backgroundImage !== 'none') {
            const matches = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/g);
            if (matches) {
                matches.forEach(match => {
                    const url = match.replace(/url\(['"]?/, '').replace(/['"]?\)$/, '');
                    if (url && !seenUrls.has(url) && !url.startsWith('data:')) {
                        seenUrls.add(url);
                        images.push({
                            type: 'background',
                            src: url,
                            alt: 'Background Image',
                            width: 0,
                            height: 0,
                            size: 0,
                            index: index
                        });
                    }
                });
            }
        }
    });
    
    console.log('[网页工具-简化版] 图片提取完成，共找到', images.length, '张图片');
    return images;
}

/**
 * 提取页面视频
 */
function extractVideosFromPage() {
    console.log('[网页工具-简化版] 开始提取页面视频');
    
    const videos = [];
    const seenUrls = new Set();
    
    // 提取video标签
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach((video, index) => {
        const src = video.src || video.currentSrc;
        if (src && !seenUrls.has(src)) {
            seenUrls.add(src);
            videos.push({
                type: 'video',
                src: src,
                title: video.title || '',
                duration: video.duration || 0,
                width: video.videoWidth || video.width || 0,
                height: video.videoHeight || video.height || 0,
                size: 0,
                index: index
            });
        }
        
        // 检查source标签
        const sources = video.querySelectorAll('source');
        sources.forEach(source => {
            const sourceSrc = source.src;
            if (sourceSrc && !seenUrls.has(sourceSrc)) {
                seenUrls.add(sourceSrc);
                videos.push({
                    type: 'video',
                    src: sourceSrc,
                    title: video.title || '',
                    duration: video.duration || 0,
                    width: video.videoWidth || video.width || 0,
                    height: video.videoHeight || video.height || 0,
                    size: 0,
                    index: index
                });
            }
        });
    });
    
    console.log('[网页工具-简化版] 视频提取完成，共找到', videos.length, '个视频');
    return videos;
}

/**
 * 提取页面音频
 */
function extractAudioFromPage() {
    console.log('[网页工具-简化版] 开始提取页面音频');
    
    const audios = [];
    const seenUrls = new Set();
    
    // 提取audio标签
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach((audio, index) => {
        const src = audio.src || audio.currentSrc;
        if (src && !seenUrls.has(src)) {
            seenUrls.add(src);
            audios.push({
                type: 'audio',
                src: src,
                title: audio.title || '',
                duration: audio.duration || 0,
                size: 0,
                index: index
            });
        }
        
        // 检查source标签
        const sources = audio.querySelectorAll('source');
        sources.forEach(source => {
            const sourceSrc = source.src;
            if (sourceSrc && !seenUrls.has(sourceSrc)) {
                seenUrls.add(sourceSrc);
                audios.push({
                    type: 'audio',
                    src: sourceSrc,
                    title: audio.title || '',
                    duration: audio.duration || 0,
                    size: 0,
                    index: index
                });
            }
        });
    });
    
    console.log('[网页工具-简化版] 音频提取完成，共找到', audios.length, '个音频');
    return audios;
} 