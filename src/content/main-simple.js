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
    
    console.log('[网页工具-简化版] 开始设置消息监听器...');
    
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
                    
                case 'EXTRACT_LINKS':
                case 'extractLinks':
                    const links = Array.from(document.querySelectorAll('a')).map((link, index) => ({
                        id: index + 1,
                        href: link.href,
                        text: link.textContent.trim() || '无标题',
                        isExternal: link.hostname !== window.location.hostname
                    }));
                    
                    const stats = {
                        total: links.length,
                        external: links.filter(l => l.isExternal).length,
                        internal: links.filter(l => !l.isExternal).length
                    };
                    
                    console.log('[网页工具-简化版] 提取链接完成:', stats);
                    sendResponse({ links, stats });
                    break;
                    
                case 'ENABLE_TEXT_SELECTION':
                case 'enableTextSelection':
                    // 简单的文本选择解除
                    const style = document.createElement('style');
                    style.id = 'website-tools-text-selection';
                    style.textContent = `
                        * {
                            -webkit-user-select: text !important;
                            -moz-user-select: text !important;
                            -ms-user-select: text !important;
                            user-select: text !important;
                        }
                    `;
                    document.head.appendChild(style);
                    console.log('[网页工具-简化版] 文本选择已启用');
                    sendResponse({ success: true });
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
     * 启用新标签页模式
     */
    function enableNewTabMode(enabled = true) {
        console.log('[网页工具-简化版] 设置新标签页模式:', enabled);
        
        // 清除之前的事件监听器
        clearLinkHandlers();
        
        if (enabled) {
            newTabMode = true;
            previewMode = false;
            
            // 添加外部链接样式
            addExternalLinkStyles();
            
            // 标记外部链接
            markExternalLinks();
            
            // 添加点击事件监听器
            currentLinkHandler = function(e) {
                const link = e.target.closest('a[href]');
                if (link && link.classList.contains('website-tools-external')) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(link.href, '_blank', 'noopener,noreferrer');
                    console.log('[网页工具-简化版] 外部链接已在新标签页打开:', link.href);
                }
            };
            
            document.addEventListener('click', currentLinkHandler, true);
            console.log('[网页工具-简化版] 新标签页模式已启用');
        } else {
            newTabMode = false;
            removeExternalLinkStyles();
            console.log('[网页工具-简化版] 新标签页模式已禁用');
        }
    }
    
    /**
     * 启用预览模式
     */
    function enablePreviewMode(enabled = true) {
        console.log('[网页工具-简化版] 设置预览模式:', enabled);
        
        // 清除之前的事件监听器
        clearLinkHandlers();
        
        if (enabled) {
            previewMode = true;
            newTabMode = false;
            
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
            console.log('[网页工具-简化版] 预览模式已禁用');
        }
    }
    
    /**
     * 清除链接事件处理器
     */
    function clearLinkHandlers() {
        if (currentLinkHandler) {
            document.removeEventListener('click', currentLinkHandler, true);
            currentLinkHandler = null;
        }
        
        // 清除所有标记
        document.querySelectorAll('.website-tools-external, .website-tools-preview').forEach(link => {
            link.classList.remove('website-tools-external', 'website-tools-preview');
        });
    }
    
    /**
     * 添加外部链接样式
     */
    function addExternalLinkStyles() {
        if (document.getElementById('website-tools-external-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'website-tools-external-styles';
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
        `;
        document.head.appendChild(style);
    }
    
    /**
     * 移除外部链接样式
     */
    function removeExternalLinkStyles() {
        const style = document.getElementById('website-tools-external-styles');
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
} 