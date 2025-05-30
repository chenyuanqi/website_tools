/**
 * 元气助手弹出窗口逻辑
 */

// Logger工具
const Logger = {
    prefix: '[弹出窗口]',
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

// 消息类型常量（与constants.js保持一致）
const MESSAGE_TYPES = {
    // 复制自由相关
    ENABLE_TEXT_SELECTION: 'enableTextSelection',
    RESTORE_RIGHT_CLICK: 'restoreRightClick',
    RESTORE_KEYBOARD_SHORTCUTS: 'restoreKeyboardShortcuts',
    
    // 链接管理相关
    ENABLE_NEW_TAB_MODE: 'enableNewTabMode',
    ENABLE_PREVIEW_MODE: 'enablePreviewMode',
    GET_LINK_STATS: 'getLinkStats',
    EXTRACT_LINKS: 'extractLinks',
    
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
    SHOW_NOTIFICATION: 'showNotification'
};

class PopupController {
    constructor() {
        this.currentTab = null;
        this.settings = null;
        this.pageInfo = null;
        
        this.init();
    }
    
    /**
     * 初始化弹出窗口
     */
    async init() {
        try {
            Logger.log('开始初始化弹出窗口...');
            
            // 获取当前标签页
            try {
                await this.getCurrentTab();
                Logger.log('当前标签页获取成功');
            } catch (error) {
                Logger.error('获取当前标签页失败:', error);
            }
            
            // 加载设置
            try {
                await this.loadSettings();
                Logger.log('设置加载成功');
            } catch (error) {
                Logger.error('加载设置失败:', error);
            }
            
            // 获取页面信息（允许失败）
            try {
                await this.getPageInfo();
                Logger.log('页面信息获取完成');
            } catch (error) {
                Logger.warn('页面信息获取失败，使用默认值:', error);
                this.pageInfo = this.getDefaultPageInfo();
            }
            
            // 初始化UI（必须成功）
            try {
                this.initUI();
                Logger.log('UI初始化成功');
            } catch (error) {
                Logger.error('UI初始化失败:', error);
                throw error; // UI初始化失败则整个初始化失败
            }
            
            // 绑定事件
            try {
                this.bindEvents();
                Logger.log('事件绑定成功');
            } catch (error) {
                Logger.error('事件绑定失败:', error);
            }
            
            Logger.log('弹出窗口初始化完成');
        } catch (error) {
            Logger.error('弹出窗口初始化失败:', error);
            this.showError('初始化失败: ' + error.message);
        }
    }
    
    /**
     * 获取当前标签页
     */
    async getCurrentTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        this.currentTab = tab;
    }
    
    /**
     * 加载设置
     */
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['websiteToolsSettings']);
            this.settings = result.websiteToolsSettings || {
                linkManager: { enabled: true },
                copyFreedom: { enabled: true },
                mediaExtractor: { enabled: true }
            };
        } catch (error) {
            console.error('[弹出窗口] 加载设置失败:', error);
            this.settings = {
                linkManager: { enabled: true },
                copyFreedom: { enabled: true },
                mediaExtractor: { enabled: true }
            };
        }
    }
    
    /**
     * 获取页面信息
     */
    async getPageInfo() {
        try {
            if (!this.currentTab || !this.currentTab.id) {
                throw new Error('无法获取当前标签页信息');
            }
            
            // 添加超时机制，避免长时间等待
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('获取页面信息超时')), 3000);
            });
            
            const messagePromise = chrome.tabs.sendMessage(this.currentTab.id, {
                type: MESSAGE_TYPES.GET_PAGE_INFO
            });
            
            const response = await Promise.race([messagePromise, timeoutPromise]);
            
            this.pageInfo = response || this.getDefaultPageInfo();
            
            Logger.log('页面信息获取成功:', this.pageInfo);
        } catch (error) {
            Logger.warn('获取页面信息失败，使用默认信息:', error.message);
            this.pageInfo = this.getDefaultPageInfo();
        }
    }
    
    /**
     * 获取默认页面信息
     */
    getDefaultPageInfo() {
        return {
            url: this.currentTab?.url || '',
            title: this.currentTab?.title || '',
            domain: this.currentTab?.url ? new URL(this.currentTab.url).hostname : '未知',
            hasImages: false,
            hasVideos: false,
            hasAudio: false,
            linkCount: 0,
            imageCount: 0,
            videoCount: 0,
            audioCount: 0,
            timestamp: Date.now()
        };
    }
    
    /**
     * 初始化UI
     */
    initUI() {
        // 更新页面信息显示
        this.updatePageInfo();
        
        // 更新功能开关状态
        this.updateToggleStates();
        
        // 更新统计信息
        this.updateStats();
    }
    
    /**
     * 更新页面信息显示
     */
    updatePageInfo() {
        const domainElement = document.getElementById('currentDomain');
        if (domainElement && this.pageInfo) {
            domainElement.textContent = this.pageInfo.domain;
            domainElement.title = this.pageInfo.url;
        }
    }
    
    /**
     * 更新功能开关状态
     */
    updateToggleStates() {
        const toggles = {
            'copyFreedomToggle': this.settings.copyFreedom?.enabled ?? true,
            'linkManagerToggle': this.settings.linkManager?.enabled ?? true,
            'mediaExtractorToggle': this.settings.mediaExtractor?.enabled ?? true
        };
        
        Object.entries(toggles).forEach(([id, enabled]) => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.checked = enabled;
                
                // 更新对应功能区域的状态
                const section = toggle.closest('.feature-section');
                if (section) {
                    section.classList.toggle('disabled', !enabled);
                }
            }
        });
        
        // 更新链接管理功能按钮状态
        this.updateLinkManagerButtons();
    }
    
    /**
     * 更新链接管理功能按钮状态
     */
    updateLinkManagerButtons() {
        const newTabButton = document.getElementById('newTabMode');
        const previewButton = document.getElementById('previewMode');
        
        if (newTabButton) {
            if (this.settings.linkManager?.newTabForExternal) {
                this.setButtonActive(newTabButton, '已启用');
            } else {
                this.setButtonInactive(newTabButton, '新标签页打开');
            }
        }
        
        if (previewButton) {
            if (this.settings.linkManager?.popupPreview) {
                this.setButtonActive(previewButton, '已启用');
            } else {
                this.setButtonInactive(previewButton, '链接预览');
            }
        }
    }
    
    /**
     * 更新统计信息
     */
    async updateStats() {
        // 统计信息已移除，此方法保留以防其他地方调用
        Logger.log('统计信息更新已简化');
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 设置按钮
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
        
        // 功能开关
        document.getElementById('copyFreedomToggle')?.addEventListener('change', (e) => {
            this.toggleFeature('copyFreedom', e.target.checked);
        });
        
        document.getElementById('linkManagerToggle')?.addEventListener('change', (e) => {
            this.toggleFeature('linkManager', e.target.checked);
        });
        
        document.getElementById('mediaExtractorToggle')?.addEventListener('change', (e) => {
            this.toggleFeature('mediaExtractor', e.target.checked);
        });
        
        // 复制自由功能按钮
        document.getElementById('enableTextSelection')?.addEventListener('click', () => {
            this.enableTextSelection();
        });
        
        document.getElementById('restoreRightClick')?.addEventListener('click', () => {
            this.restoreRightClick();
        });
        
        // 链接管理功能按钮
        document.getElementById('newTabMode')?.addEventListener('click', () => {
            this.toggleNewTabMode();
        });
        
        document.getElementById('previewMode')?.addEventListener('click', () => {
            this.togglePreviewMode();
        });
        
        document.getElementById('extractLinks')?.addEventListener('click', () => {
            this.extractLinks();
        });
        
        // 媒体提取功能按钮
        document.getElementById('extractImages')?.addEventListener('click', () => {
            this.extractImages();
        });
        
        document.getElementById('extractVideos')?.addEventListener('click', () => {
            this.extractVideos();
        });
        
        // 页脚按钮
        document.getElementById('openSidePanel')?.addEventListener('click', () => {
            this.openSidePanel();
        });
        
        document.getElementById('refreshPage')?.addEventListener('click', () => {
            this.refreshPage();
        });
    }
    
    /**
     * 切换功能模块
     */
    async toggleFeature(feature, enabled) {
        try {
            this.settings[feature].enabled = enabled;
            await chrome.storage.sync.set({ websiteToolsSettings: this.settings });
            
            // 更新UI状态
            const section = document.querySelector(`#${feature}Toggle`).closest('.feature-section');
            if (section) {
                section.classList.toggle('disabled', !enabled);
            }
            
            // 发送消息给content script
            if (this.currentTab?.id) {
                await chrome.tabs.sendMessage(this.currentTab.id, {
                    type: MESSAGE_TYPES.UPDATE_SETTINGS,
                    data: this.settings
                });
            }
            
            this.showSuccess(`${this.getFeatureName(feature)}已${enabled ? '启用' : '禁用'}`);
        } catch (error) {
            console.error('[弹出窗口] 切换功能失败:', error);
            this.showError('操作失败，请重试');
        }
    }
    
    /**
     * 启用文本选择
     */
    async enableTextSelection() {
        try {
            if (!this.currentTab?.id) {
                throw new Error('无法获取当前标签页');
            }
            
            const button = document.getElementById('enableTextSelection');
            this.setButtonLoading(button, true);
            
            await chrome.tabs.sendMessage(this.currentTab.id, {
                type: MESSAGE_TYPES.ENABLE_TEXT_SELECTION,
                data: { enabled: true }
            });
            
            this.setButtonSuccess(button, '已解除限制');
            this.showSuccess('文本选择限制已解除！');
            
        } catch (error) {
            console.error('[弹出窗口] 启用文本选择失败:', error);
            this.showError('操作失败，请确保页面已加载完成');
        } finally {
            const button = document.getElementById('enableTextSelection');
            this.setButtonLoading(button, false);
        }
    }
    
    /**
     * 恢复右键菜单
     */
    async restoreRightClick() {
        try {
            if (!this.currentTab?.id) {
                throw new Error('无法获取当前标签页');
            }
            
            const button = document.getElementById('restoreRightClick');
            this.setButtonLoading(button, true);
            
            await chrome.tabs.sendMessage(this.currentTab.id, {
                type: MESSAGE_TYPES.RESTORE_RIGHT_CLICK,
                data: { enabled: true }
            });
            
            this.setButtonSuccess(button, '已恢复菜单');
            this.showSuccess('右键菜单已恢复！');
            
        } catch (error) {
            console.error('[弹出窗口] 恢复右键菜单失败:', error);
            this.showError('操作失败，请重试');
        } finally {
            const button = document.getElementById('restoreRightClick');
            this.setButtonLoading(button, false);
        }
    }
    
    /**
     * 切换新标签页模式
     */
    async toggleNewTabMode() {
        try {
            const button = document.getElementById('newTabMode');
            const previewButton = document.getElementById('previewMode');
            const isEnabled = !this.settings.linkManager?.newTabForExternal;
            
            this.settings.linkManager = this.settings.linkManager || {};
            this.settings.linkManager.newTabForExternal = isEnabled;
            
            // 如果启用新标签页模式，自动禁用预览模式
            if (isEnabled) {
                this.settings.linkManager.popupPreview = false;
            }
            
            await chrome.storage.sync.set({ websiteToolsSettings: this.settings });
            
            // 发送消息给content script
            if (this.currentTab?.id) {
                await chrome.tabs.sendMessage(this.currentTab.id, {
                    type: 'ENABLE_NEW_TAB_MODE',
                    data: { enabled: isEnabled }
                });
                console.log('[弹出窗口] 已发送新标签页模式消息:', isEnabled);
            }
            
            // 更新按钮状态
            this.updateLinkManagerButtons();
            
            this.showSuccess(`新标签页模式已${isEnabled ? '启用' : '禁用'}${isEnabled ? '（预览模式已自动禁用）' : ''}`);
            
        } catch (error) {
            console.error('[弹出窗口] 切换新标签页模式失败:', error);
            this.showError('操作失败，请重试');
        }
    }
    
    /**
     * 切换预览模式
     */
    async togglePreviewMode() {
        try {
            const button = document.getElementById('previewMode');
            const newTabButton = document.getElementById('newTabMode');
            const isEnabled = !this.settings.linkManager?.popupPreview;
            
            this.settings.linkManager = this.settings.linkManager || {};
            this.settings.linkManager.popupPreview = isEnabled;
            
            // 如果启用预览模式，自动禁用新标签页模式
            if (isEnabled) {
                this.settings.linkManager.newTabForExternal = false;
            }
            
            await chrome.storage.sync.set({ websiteToolsSettings: this.settings });
            
            // 发送消息给content script
            if (this.currentTab?.id) {
                await chrome.tabs.sendMessage(this.currentTab.id, {
                    type: 'ENABLE_PREVIEW_MODE',
                    data: { enabled: isEnabled }
                });
                console.log('[弹出窗口] 已发送预览模式消息:', isEnabled);
            }
            
            // 更新按钮状态
            this.updateLinkManagerButtons();
            
            this.showSuccess(`预览模式已${isEnabled ? '启用' : '禁用'}${isEnabled ? '（新标签页模式已自动禁用）' : ''}`);
            
        } catch (error) {
            console.error('[弹出窗口] 切换预览模式失败:', error);
            this.showError('操作失败，请重试');
        }
    }
    
    /**
     * 提取图片
     */
    async extractImages() {
        try {
            if (!this.currentTab?.id) {
                throw new Error('无法获取当前标签页');
            }
            
            const button = document.getElementById('extractImages');
            this.setButtonLoading(button, true);
            
            const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                type: MESSAGE_TYPES.EXTRACT_IMAGES
            });
            
            if (response && response.images) {
                this.setButtonSuccess(button, `找到${response.images.length}张`);
                this.showSuccess(`成功提取${response.images.length}张图片`);
                
                // 打开侧边栏显示结果
                await this.openSidePanel();
            } else {
                this.showError('未找到图片');
            }
            
        } catch (error) {
            console.error('[弹出窗口] 提取图片失败:', error);
            this.showError('提取失败，请重试');
        } finally {
            const button = document.getElementById('extractImages');
            this.setButtonLoading(button, false);
        }
    }
    
    /**
     * 提取视频
     */
    async extractVideos() {
        try {
            if (!this.currentTab?.id) {
                throw new Error('无法获取当前标签页');
            }
            
            const button = document.getElementById('extractVideos');
            this.setButtonLoading(button, true);
            
            const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                type: MESSAGE_TYPES.EXTRACT_VIDEOS
            });
            
            if (response && response.videos) {
                this.setButtonSuccess(button, `找到${response.videos.length}个`);
                this.showSuccess(`成功检测${response.videos.length}个视频`);
                
                // 打开侧边栏显示结果
                await this.openSidePanel();
            } else {
                this.showError('未找到视频');
            }
            
        } catch (error) {
            console.error('[弹出窗口] 检测视频失败:', error);
            this.showError('检测失败，请重试');
        } finally {
            const button = document.getElementById('extractVideos');
            this.setButtonLoading(button, false);
        }
    }
    
    /**
     * 打开侧边栏
     */
    async openSidePanel() {
        try {
            if (this.currentTab?.id) {
                await chrome.sidePanel.open({ tabId: this.currentTab.id });
                window.close(); // 关闭弹出窗口
            }
        } catch (error) {
            console.error('[弹出窗口] 打开侧边栏失败:', error);
            this.showError('打开侧边栏失败');
        }
    }
    
    /**
     * 刷新页面
     */
    async refreshPage() {
        try {
            if (this.currentTab?.id) {
                await chrome.tabs.reload(this.currentTab.id);
                window.close(); // 关闭弹出窗口
            }
        } catch (error) {
            console.error('[弹出窗口] 刷新页面失败:', error);
            this.showError('刷新页面失败');
        }
    }
    
    /**
     * 设置按钮加载状态
     */
    setButtonLoading(button, loading) {
        if (!button) return;
        
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }
    
    /**
     * 设置按钮成功状态
     */
    setButtonSuccess(button, text) {
        if (!button) return;
        
        button.classList.add('success');
        const originalText = button.textContent;
        button.textContent = text;
        
        setTimeout(() => {
            button.classList.remove('success');
            button.textContent = originalText;
        }, 2000);
    }
    
    /**
     * 设置按钮激活状态（持久显示）
     */
    setButtonActive(button, text) {
        if (!button) return;
        
        button.classList.add('success');
        button.classList.remove('inactive');
        
        // 获取按钮的原始文本（从innerHTML中提取图标和文本）
        const iconElement = button.querySelector('.btn-icon');
        const iconHtml = iconElement ? iconElement.outerHTML : '';
        
        button.innerHTML = iconHtml + text;
    }
    
    /**
     * 设置按钮非激活状态（持久显示）
     */
    setButtonInactive(button, text) {
        if (!button) return;
        
        button.classList.remove('success');
        button.classList.add('inactive');
        
        // 获取按钮的原始文本（从innerHTML中提取图标和文本）
        const iconElement = button.querySelector('.btn-icon');
        const iconHtml = iconElement ? iconElement.outerHTML : '';
        
        button.innerHTML = iconHtml + text;
    }
    
    /**
     * 显示成功消息
     */
    showSuccess(message) {
        console.log('[弹出窗口] 成功:', message);
        // TODO: 实现更好的通知UI
    }
    
    /**
     * 显示错误消息
     */
    showError(message) {
        console.error('[弹出窗口] 错误:', message);
        // TODO: 实现更好的错误UI
    }
    
    /**
     * 获取功能名称
     */
    getFeatureName(feature) {
        const names = {
            'copyFreedom': '复制自由',
            'linkManager': '链接管理',
            'mediaExtractor': '媒体提取'
        };
        return names[feature] || feature;
    }
    
    /**
     * 提取链接
     */
    async extractLinks() {
        try {
            if (!this.currentTab?.id) {
                throw new Error('无法获取当前标签页');
            }
            
            const button = document.getElementById('extractLinks');
            this.setButtonLoading(button, true);
            
            const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                type: MESSAGE_TYPES.EXTRACT_LINKS
            });
            
            if (response && response.links) {
                this.setButtonSuccess(button, `找到${response.stats.total}个`);
                this.showSuccess(`成功提取${response.stats.total}个链接`);
                
                // 显示链接弹框
                this.createLinksModal(response);
            } else {
                this.showError('未找到链接');
            }
            
        } catch (error) {
            console.error('[弹出窗口] 提取链接失败:', error);
            this.showError('提取失败，请重试');
        } finally {
            const button = document.getElementById('extractLinks');
            this.setButtonLoading(button, false);
        }
    }
    
    /**
     * 创建链接显示弹框
     */
    createLinksModal(data) {
        // 移除已存在的弹框
        const existingModal = document.getElementById('linksModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 创建弹框HTML
        const modal = document.createElement('div');
        modal.id = 'linksModal';
        modal.className = 'links-modal';
        
        const { links, stats } = data;
        
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>页面链接提取</h3>
                        <button class="modal-close" onclick="this.closest('.links-modal').remove()">×</button>
                    </div>
                    <div class="modal-stats">
                        <span class="stat-badge">总计: ${stats.total}</span>
                        <span class="stat-badge external">外部: ${stats.external}</span>
                        <span class="stat-badge internal">内部: ${stats.internal}</span>
                    </div>
                    <div class="modal-body">
                        <div class="links-container">
                            ${this.generateLinksHTML(links)}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="modal-btn" onclick="this.closest('.links-modal').remove()">关闭</button>
                        <button class="modal-btn primary" onclick="window.copyLinksToClipboard()">复制所有链接</button>
                    </div>
                </div>
            </div>
        `;
        
        // 添加样式
        this.addModalStyles();
        
        // 添加到页面
        document.body.appendChild(modal);
        
        // 存储链接数据供复制使用
        window.extractedLinksData = links;
        
        // 添加复制功能
        window.copyLinksToClipboard = () => {
            const linkTexts = links.map(link => `${link.text}: ${link.href}`).join('\n');
            navigator.clipboard.writeText(linkTexts).then(() => {
                this.showSuccess('链接已复制到剪贴板');
            }).catch(() => {
                this.showError('复制失败');
            });
        };
        
        Logger.log('链接弹框已创建，显示', stats.total, '个链接');
    }
    
    /**
     * 生成链接HTML
     */
    generateLinksHTML(links) {
        return links.map(link => `
            <div class="link-item ${link.isExternal ? 'external' : 'internal'}">
                <div class="link-info">
                    <div class="link-text">${this.escapeHtml(link.text)}</div>
                    <div class="link-url">${this.escapeHtml(link.href)}</div>
                    <div class="link-meta">
                        <span class="link-type">${link.isExternal ? '外部' : '内部'}</span>
                        <span class="link-domain">${this.escapeHtml(link.domain)}</span>
                    </div>
                </div>
                <div class="link-actions">
                    <button class="link-btn" onclick="window.open('${this.escapeHtml(link.href)}', '_blank')" title="在新标签页打开">
                        🔗
                    </button>
                    <button class="link-btn" onclick="navigator.clipboard.writeText('${this.escapeHtml(link.href)}')" title="复制链接">
                        📋
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 添加弹框样式
     */
    addModalStyles() {
        if (document.getElementById('linksModalStyles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'linksModalStyles';
        styles.textContent = `
            .links-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .modal-content {
                background: white;
                border-radius: 12px;
                width: 100%;
                max-width: 600px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }
            
            .modal-header {
                padding: 20px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .modal-header h3 {
                margin: 0;
                font-size: 18px;
                color: #333;
            }
            
            .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            }
            
            .modal-close:hover {
                background: #f5f5f5;
                color: #333;
            }
            
            .modal-stats {
                padding: 15px 20px;
                background: #f8f9fa;
                display: flex;
                gap: 10px;
            }
            
            .stat-badge {
                background: #e9ecef;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
            }
            
            .stat-badge.external {
                background: #fff3cd;
                color: #856404;
            }
            
            .stat-badge.internal {
                background: #d1ecf1;
                color: #0c5460;
            }
            
            .modal-body {
                flex: 1;
                overflow: hidden;
                padding: 0;
            }
            
            .links-container {
                height: 400px;
                overflow-y: auto;
                padding: 10px 20px;
            }
            
            .link-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                border: 1px solid #eee;
                border-radius: 8px;
                margin-bottom: 8px;
                transition: all 0.2s ease;
            }
            
            .link-item:hover {
                border-color: #007bff;
                background: #f8f9ff;
            }
            
            .link-item.external {
                border-left: 3px solid #ffc107;
            }
            
            .link-item.internal {
                border-left: 3px solid #17a2b8;
            }
            
            .link-info {
                flex: 1;
                min-width: 0;
            }
            
            .link-text {
                font-weight: 500;
                color: #333;
                margin-bottom: 4px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .link-url {
                font-size: 12px;
                color: #666;
                margin-bottom: 4px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .link-meta {
                display: flex;
                gap: 10px;
                font-size: 11px;
            }
            
            .link-type {
                background: #e9ecef;
                padding: 2px 6px;
                border-radius: 10px;
                font-weight: 500;
            }
            
            .link-domain {
                color: #666;
            }
            
            .link-actions {
                display: flex;
                gap: 5px;
                margin-left: 10px;
            }
            
            .link-btn {
                background: none;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s ease;
            }
            
            .link-btn:hover {
                background: #f5f5f5;
                border-color: #007bff;
            }
            
            .modal-footer {
                padding: 20px;
                border-top: 1px solid #eee;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            
            .modal-btn {
                padding: 8px 16px;
                border: 1px solid #ddd;
                border-radius: 6px;
                background: white;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s ease;
            }
            
            .modal-btn:hover {
                background: #f5f5f5;
            }
            
            .modal-btn.primary {
                background: #007bff;
                color: white;
                border-color: #007bff;
            }
            
            .modal-btn.primary:hover {
                background: #0056b3;
                border-color: #0056b3;
            }
        `;
        
        document.head.appendChild(styles);
    }
}

// 当DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
}); 