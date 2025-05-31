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

// 消息类型常量
const MESSAGE_TYPES = {
    // 复制限制解除相关
    ENABLE_TEXT_SELECTION: 'enableTextSelection',
    RESTORE_RIGHT_CLICK: 'restoreRightClick',
    RESTORE_SHORTCUTS: 'restoreShortcuts',
    
    // 链接管理相关
    ENABLE_NEW_TAB_MODE: 'enableNewTabMode',
    ENABLE_TARGET_BLANK_MODE: 'enableTargetBlankMode',
    ENABLE_PREVIEW_MODE: 'enablePreviewMode',
    GET_LINK_STATS: 'getLinkStats',
    
    // 媒体提取相关
    EXTRACT_IMAGES: 'extractImages',
    EXTRACT_VIDEOS: 'extractVideos',
    EXTRACT_AUDIO: 'extractAudio',
    
    // 通用
    GET_PAGE_INFO: 'getPageInfo'
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
            
            // 检查是否为特殊页面
            if (this.isSpecialPage(this.currentTab.url)) {
                this.pageInfo = this.getDefaultPageInfo();
                this.pageInfo.isSpecialPage = true;
                return;
            }
            
            // 使用重连机制获取页面信息
            const response = await this.tryConnectWithRetry();
            this.pageInfo = response || this.getDefaultPageInfo();
            
            Logger.log('页面信息获取成功:', this.pageInfo);
        } catch (error) {
            Logger.warn('获取页面信息失败，使用默认信息:', error.message);
            this.pageInfo = this.getDefaultPageInfo();
            this.pageInfo.connectionError = true;
        }
    }
    
    /**
     * 尝试连接Content Script，支持重试和主动注入
     */
    async tryConnectWithRetry(maxRetries = 2) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                Logger.log(`尝试连接Content Script (第${attempt}次)`);
                
                // 设置超时时间
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('连接超时')), 2000);
                });
                
                const messagePromise = chrome.tabs.sendMessage(this.currentTab.id, {
                    type: MESSAGE_TYPES.GET_PAGE_INFO
                });
                
                const response = await Promise.race([messagePromise, timeoutPromise]);
                Logger.log('连接成功，收到响应:', response);
                return response;
                
            } catch (error) {
                Logger.warn(`第${attempt}次连接失败:`, error.message);
                
                if (attempt === maxRetries) {
                    // 最后一次尝试失败，尝试主动注入Content Script
                    Logger.log('所有连接尝试失败，尝试主动注入Content Script');
                    try {
                        await this.injectContentScript();
                        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒让脚本初始化
                        
                        const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                            type: MESSAGE_TYPES.GET_PAGE_INFO
                        });
                        Logger.log('注入后连接成功:', response);
                        return response;
                    } catch (injectError) {
                        Logger.error('注入后仍然连接失败:', injectError);
                        throw new Error('无法建立连接');
                    }
                } else {
                    // 等待一段时间后重试
                    await new Promise(resolve => setTimeout(resolve, 500 * attempt));
                }
            }
        }
    }
    
    /**
     * 主动注入Content Script
     */
    async injectContentScript() {
        try {
            Logger.log('开始主动注入Content Script');
            
            // 检查是否有scripting权限
            if (!chrome.scripting) {
                throw new Error('缺少scripting权限');
            }
            
            // 注入主要的Content Script
            await chrome.scripting.executeScript({
                target: { tabId: this.currentTab.id },
                files: ['src/content/main-simple.js']
            });
            
            Logger.log('Content Script注入成功');
            
        } catch (error) {
            Logger.error('注入Content Script失败:', error);
            throw error;
        }
    }
    
    /**
     * 检查是否为特殊页面
     */
    isSpecialPage(url) {
        if (!url) return true;
        
        const specialPagePrefixes = [
            'chrome://',
            'chrome-extension://',
            'moz-extension://',
            'edge://',
            'about:',
            'file://',
            'data:',
            'javascript:',
            'chrome-search://',
            'chrome-devtools://'
        ];
        
        return specialPagePrefixes.some(prefix => url.startsWith(prefix));
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
     * 更新链接管理按钮状态
     */
    updateLinkManagerButtons() {
        const newTabButton = document.getElementById('newTabMode');
        const targetBlankButton = document.getElementById('targetBlankMode');
        const previewButton = document.getElementById('previewMode');
        
        if (newTabButton) {
            if (this.settings.linkManager?.newTabForExternal) {
                this.setButtonActive(newTabButton);
            } else {
                this.setButtonInactive(newTabButton);
            }
        }
        
        if (targetBlankButton) {
            if (this.settings.linkManager?.targetBlankMode) {
                this.setButtonActive(targetBlankButton);
            } else {
                this.setButtonInactive(targetBlankButton);
            }
        }
        
        if (previewButton) {
            if (this.settings.linkManager?.popupPreview) {
                this.setButtonActive(previewButton);
            } else {
                this.setButtonInactive(previewButton);
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
        
        document.getElementById('targetBlankMode')?.addEventListener('click', () => {
            this.toggleTargetBlankMode();
        });
        
        document.getElementById('previewMode')?.addEventListener('click', () => {
            this.togglePreviewMode();
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
            const isEnabled = !this.settings.linkManager?.newTabForExternal;
            
            this.settings.linkManager = this.settings.linkManager || {};
            this.settings.linkManager.newTabForExternal = isEnabled;
            
            await chrome.storage.sync.set({ websiteToolsSettings: this.settings });
            
            // 使用重连机制发送消息给content script
            if (this.currentTab?.id && !this.isSpecialPage(this.currentTab.url)) {
                try {
                    await this.sendMessageWithRetry({
                        type: 'ENABLE_NEW_TAB_MODE',
                        data: { enabled: isEnabled }
                    });
                    console.log('[弹出窗口] 已发送新标签页模式消息:', isEnabled);
                } catch (error) {
                    console.warn('[弹出窗口] 发送新标签页模式消息失败:', error);
                    // 不阻止设置保存，只是无法立即应用到当前页面
                }
            }
            
            // 更新按钮状态
            this.updateLinkManagerButtons();
            
            this.showSuccess(`新标签页模式已${isEnabled ? '启用' : '禁用'}`);
            
        } catch (error) {
            console.error('[弹出窗口] 切换新标签页模式失败:', error);
            this.showError('操作失败，请重试');
        }
    }
    
    /**
     * 切换Target属性模式
     */
    async toggleTargetBlankMode() {
        try {
            const button = document.getElementById('targetBlankMode');
            const isEnabled = !this.settings.linkManager?.targetBlankMode;
            
            this.settings.linkManager = this.settings.linkManager || {};
            this.settings.linkManager.targetBlankMode = isEnabled;
            
            await chrome.storage.sync.set({ websiteToolsSettings: this.settings });
            
            // 使用重连机制发送消息给content script
            if (this.currentTab?.id && !this.isSpecialPage(this.currentTab.url)) {
                try {
                    await this.sendMessageWithRetry({
                        type: 'ENABLE_TARGET_BLANK_MODE',
                        data: { enabled: isEnabled }
                    });
                    console.log('[弹出窗口] 已发送Target属性模式消息:', isEnabled);
                } catch (error) {
                    console.warn('[弹出窗口] 发送Target属性模式消息失败:', error);
                    // 不阻止设置保存，只是无法立即应用到当前页面
                }
            }
            
            // 更新按钮状态
            this.updateLinkManagerButtons();
            
            this.showSuccess(`Target属性模式已${isEnabled ? '启用' : '禁用'}`);
            
        } catch (error) {
            console.error('[弹出窗口] 切换Target属性模式失败:', error);
            this.showError('操作失败，请重试');
        }
    }
    
    /**
     * 切换预览模式
     */
    async togglePreviewMode() {
        try {
            const button = document.getElementById('previewMode');
            const isEnabled = !this.settings.linkManager?.popupPreview;
            
            this.settings.linkManager = this.settings.linkManager || {};
            this.settings.linkManager.popupPreview = isEnabled;
            
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
            
            this.showSuccess(`预览模式已${isEnabled ? '启用' : '禁用'}`);
            
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
    setButtonActive(button) {
        if (!button) return;
        
        button.classList.add('success');
        button.classList.remove('inactive');
    }
    
    /**
     * 设置按钮非激活状态（持久显示）
     */
    setButtonInactive(button) {
        if (!button) return;
        
        button.classList.remove('success');
        button.classList.add('inactive');
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
     * 带重连机制的消息发送
     */
    async sendMessageWithRetry(message, maxRetries = 2) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                Logger.log(`发送消息 (第${attempt}次):`, message.type);
                
                // 设置超时时间
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('消息发送超时')), 2000);
                });
                
                const messagePromise = chrome.tabs.sendMessage(this.currentTab.id, message);
                
                const response = await Promise.race([messagePromise, timeoutPromise]);
                Logger.log('消息发送成功，收到响应:', response);
                return response;
                
            } catch (error) {
                Logger.warn(`第${attempt}次消息发送失败:`, error.message);
                
                if (attempt === maxRetries) {
                    // 最后一次尝试失败，尝试重新注入并重试
                    Logger.log('消息发送失败，尝试重新注入Content Script');
                    try {
                        await this.injectContentScript();
                        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待脚本初始化
                        
                        const response = await chrome.tabs.sendMessage(this.currentTab.id, message);
                        Logger.log('重新注入后消息发送成功:', response);
                        return response;
                    } catch (injectError) {
                        Logger.error('重新注入后仍然失败:', injectError);
                        throw new Error('无法建立连接');
                    }
                } else {
                    // 等待一段时间后重试
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
    }
}

// 当DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
}); 