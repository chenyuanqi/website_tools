/**
 * 元气助手侧边栏逻辑
 */

class SidePanelController {
    constructor() {
        this.currentTab = null;
        this.settings = null;
        this.pageInfo = null;
        this.mediaCache = {
            images: [],
            videos: [],
            audio: []
        };
        
        this.init();
    }
    
    /**
     * 初始化侧边栏
     */
    async init() {
        try {
            // 获取当前标签页
            await this.getCurrentTab();
            
            // 加载设置
            await this.loadSettings();
            
            // 获取页面信息
            await this.getPageInfo();
            
            // 初始化UI
            this.initUI();
            
            // 绑定事件
            this.bindEvents();
            
            // 开始周期性更新
            this.startPeriodicUpdate();
            
            console.log('[侧边栏] 初始化完成');
        } catch (error) {
            console.error('[侧边栏] 初始化失败:', error);
            this.showStatus('初始化失败', 'error');
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
                linkManager: { enabled: true, newTabForExternal: true, popupPreview: false },
                copyFreedom: { enabled: true, textSelection: true, rightClickMenu: true, keyboardShortcuts: true },
                mediaExtractor: { enabled: true, autoDetectImages: true, autoDetectVideos: false, autoDetectAudio: false }
            };
        } catch (error) {
            console.error('[侧边栏] 加载设置失败:', error);
            this.settings = {};
        }
    }
    
    /**
     * 获取页面信息
     */
    async getPageInfo() {
        try {
            if (!this.currentTab?.id) {
                throw new Error('无法获取当前标签页信息');
            }
            
            const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                type: 'GET_PAGE_INFO'
            });
            
            this.pageInfo = response || {
                url: this.currentTab.url,
                title: this.currentTab.title,
                domain: new URL(this.currentTab.url).hostname,
                hasImages: false,
                hasVideos: false,
                hasAudio: false,
                linkCount: 0
            };
        } catch (error) {
            console.error('[侧边栏] 获取页面信息失败:', error);
            this.pageInfo = {
                url: this.currentTab?.url || '',
                title: this.currentTab?.title || '',
                domain: this.currentTab?.url ? new URL(this.currentTab.url).hostname : '未知',
                hasImages: false,
                hasVideos: false,
                hasAudio: false,
                linkCount: 0
            };
        }
    }
    
    /**
     * 初始化UI
     */
    initUI() {
        // 更新页面信息
        this.updatePageInfo();
        
        // 更新设置状态
        this.updateSettingsUI();
        
        // 更新统计信息
        this.updateStats();
        
        // 显示默认标签页
        this.showModule('copyFreedom');
    }
    
    /**
     * 更新页面信息
     */
    updatePageInfo() {
        const domainElement = document.getElementById('pageDomain');
        const statusElement = document.getElementById('pageStatus');
        
        if (domainElement && this.pageInfo) {
            domainElement.textContent = this.pageInfo.domain;
            domainElement.title = this.pageInfo.url;
        }
        
        if (statusElement) {
            statusElement.textContent = '已连接';
        }
    }
    
    /**
     * 更新设置UI
     */
    updateSettingsUI() {
        // 更新主开关
        const toggles = {
            'copyFreedomEnabled': this.settings.copyFreedom?.enabled ?? true,
            'linkManagerEnabled': this.settings.linkManager?.enabled ?? true,
            'mediaExtractorEnabled': this.settings.mediaExtractor?.enabled ?? true,
            'textSelectionEnabled': this.settings.copyFreedom?.textSelection ?? true,
            'rightClickEnabled': this.settings.copyFreedom?.rightClickMenu ?? true,
            'shortcutsEnabled': this.settings.copyFreedom?.keyboardShortcuts ?? true,
            'newTabEnabled': this.settings.linkManager?.newTabForExternal ?? true,
            'previewEnabled': this.settings.linkManager?.popupPreview ?? false
        };
        
        Object.entries(toggles).forEach(([id, enabled]) => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.checked = enabled;
            }
        });
    }
    
    /**
     * 更新统计信息
     */
    updateStats() {
        if (!this.pageInfo) return;
        
        // 链接统计
        document.getElementById('totalLinks').textContent = this.pageInfo.linkCount || '0';
        
        // 媒体统计
        document.getElementById('imageCount').textContent = this.mediaCache.images.length || '0';
        document.getElementById('videoCount').textContent = this.mediaCache.videos.length || '0';
        document.getElementById('audioCount').textContent = this.mediaCache.audio.length || '0';
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 头部按钮
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.refreshPage();
        });
        
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
        
        // 标签切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const module = e.currentTarget.dataset.module;
                this.showModule(module);
            });
        });
        
        // 功能开关
        this.bindToggleEvents();
        
        // 功能按钮
        this.bindActionButtons();
        
        // 媒体提取按钮
        this.bindMediaButtons();
        
        // 页脚按钮
        this.bindFooterButtons();
    }
    
    /**
     * 绑定开关事件
     */
    bindToggleEvents() {
        const toggleHandlers = {
            'copyFreedomEnabled': (enabled) => this.toggleModule('copyFreedom', enabled),
            'linkManagerEnabled': (enabled) => this.toggleModule('linkManager', enabled),
            'mediaExtractorEnabled': (enabled) => this.toggleModule('mediaExtractor', enabled),
            'textSelectionEnabled': (enabled) => this.toggleFeature('copyFreedom', 'textSelection', enabled),
            'rightClickEnabled': (enabled) => this.toggleFeature('copyFreedom', 'rightClickMenu', enabled),
            'shortcutsEnabled': (enabled) => this.toggleFeature('copyFreedom', 'keyboardShortcuts', enabled),
            'newTabEnabled': (enabled) => this.toggleFeature('linkManager', 'newTabForExternal', enabled),
            'previewEnabled': (enabled) => this.toggleFeature('linkManager', 'popupPreview', enabled)
        };
        
        Object.entries(toggleHandlers).forEach(([id, handler]) => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    handler(e.target.checked);
                });
            }
        });
    }
    
    /**
     * 绑定功能按钮事件
     */
    bindActionButtons() {
        // 复制自由功能
        document.getElementById('enableTextSelectionBtn')?.addEventListener('click', () => {
            this.executeFeature('enableTextSelection');
        });
        
        document.getElementById('restoreRightClickBtn')?.addEventListener('click', () => {
            this.executeFeature('restoreRightClick');
        });
        
        document.getElementById('restoreShortcutsBtn')?.addEventListener('click', () => {
            this.executeFeature('restoreShortcuts');
        });
    }
    
    /**
     * 绑定媒体按钮事件
     */
    bindMediaButtons() {
        document.getElementById('extractImagesBtn')?.addEventListener('click', () => {
            this.extractMedia('images');
        });
        
        document.getElementById('extractVideosBtn')?.addEventListener('click', () => {
            this.extractMedia('videos');
        });
        
        document.getElementById('extractAudioBtn')?.addEventListener('click', () => {
            this.extractMedia('audio');
        });
        
        // 批量操作
        document.getElementById('selectAllBtn')?.addEventListener('click', () => {
            this.selectAllMedia();
        });
        
        document.getElementById('downloadSelectedBtn')?.addEventListener('click', () => {
            this.downloadSelectedMedia();
        });
        
        document.getElementById('clearListBtn')?.addEventListener('click', () => {
            this.clearMediaList();
        });
    }
    
    /**
     * 绑定页脚按钮事件
     */
    bindFooterButtons() {
        document.getElementById('exportSettingsBtn')?.addEventListener('click', () => {
            this.exportSettings();
        });
        
        document.getElementById('importSettingsBtn')?.addEventListener('click', () => {
            this.importSettings();
        });
        
        document.getElementById('helpBtn')?.addEventListener('click', () => {
            this.showHelp();
        });
    }
    
    /**
     * 显示指定模块
     */
    showModule(moduleName) {
        // 更新标签状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.module === moduleName);
        });
        
        // 显示对应面板
        document.querySelectorAll('.module-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === moduleName + 'Panel');
        });
        
        // 特殊处理
        if (moduleName === 'mediaExtractor') {
            this.updateMediaCounts();
        } else if (moduleName === 'linkManager') {
            this.updateLinkStats();
        }
    }
    
    /**
     * 切换模块
     */
    async toggleModule(module, enabled) {
        try {
            this.settings[module].enabled = enabled;
            await this.saveSettings();
            
            // 发送消息给content script
            if (this.currentTab?.id) {
                await chrome.tabs.sendMessage(this.currentTab.id, {
                    type: 'UPDATE_SETTINGS',
                    data: this.settings
                });
            }
            
            this.showStatus(`${this.getModuleName(module)}已${enabled ? '启用' : '禁用'}`);
        } catch (error) {
            console.error('[侧边栏] 切换模块失败:', error);
            this.showStatus('操作失败', 'error');
        }
    }
    
    /**
     * 切换功能特性
     */
    async toggleFeature(module, feature, enabled) {
        try {
            this.settings[module][feature] = enabled;
            await this.saveSettings();
            
            // 发送消息给content script
            if (this.currentTab?.id) {
                await chrome.tabs.sendMessage(this.currentTab.id, {
                    type: 'UPDATE_SETTINGS',
                    data: this.settings
                });
            }
            
            this.showStatus(`${feature}已${enabled ? '启用' : '禁用'}`);
        } catch (error) {
            console.error('[侧边栏] 切换功能失败:', error);
            this.showStatus('操作失败', 'error');
        }
    }
    
    /**
     * 执行功能
     */
    async executeFeature(action) {
        try {
            if (!this.currentTab?.id) {
                throw new Error('无法获取当前标签页');
            }
            
            let messageType;
            switch (action) {
                case 'enableTextSelection':
                    messageType = 'ENABLE_TEXT_SELECTION';
                    break;
                case 'restoreRightClick':
                    messageType = 'RESTORE_RIGHT_CLICK';
                    break;
                case 'restoreShortcuts':
                    messageType = 'RESTORE_SHORTCUTS';
                    break;
                default:
                    throw new Error('未知的操作');
            }
            
            const button = document.getElementById(action + 'Btn');
            this.setButtonLoading(button, true);
            
            await chrome.tabs.sendMessage(this.currentTab.id, {
                type: messageType,
                data: { enabled: true }
            });
            
            this.setButtonSuccess(button);
            this.showStatus('操作成功');
            
        } catch (error) {
            console.error('[侧边栏] 执行功能失败:', error);
            this.showStatus('操作失败', 'error');
        }
    }
    
    /**
     * 提取媒体
     */
    async extractMedia(type) {
        try {
            if (!this.currentTab?.id) {
                throw new Error('无法获取当前标签页');
            }
            
            const button = document.getElementById(`extract${type.charAt(0).toUpperCase() + type.slice(1)}Btn`);
            this.setButtonLoading(button, true);
            
            const messageType = `EXTRACT_${type.toUpperCase()}`;
            const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                type: messageType
            });
            
            if (response && response[type]) {
                this.mediaCache[type] = response[type];
                this.updateMediaList(type);
                this.updateMediaCounts();
                this.showStatus(`找到${response[type].length}个${this.getMediaTypeName(type)}`);
            } else {
                this.showStatus(`未找到${this.getMediaTypeName(type)}`, 'warning');
            }
            
        } catch (error) {
            console.error('[侧边栏] 提取媒体失败:', error);
            this.showStatus('提取失败', 'error');
        } finally {
            const button = document.getElementById(`extract${type.charAt(0).toUpperCase() + type.slice(1)}Btn`);
            this.setButtonLoading(button, false);
        }
    }
    
    /**
     * 更新媒体列表
     */
    updateMediaList(type) {
        const mediaList = document.getElementById('mediaList');
        const emptyState = document.getElementById('emptyState');
        const batchActions = document.getElementById('batchActions');
        
        if (!mediaList) return;
        
        const items = this.mediaCache[type] || [];
        
        if (items.length === 0) {
            emptyState.style.display = 'flex';
            batchActions.style.display = 'none';
            return;
        }
        
        emptyState.style.display = 'none';
        batchActions.style.display = 'flex';
        
        // 清空现有内容（保留空状态）
        const existingItems = mediaList.querySelectorAll('.media-item');
        existingItems.forEach(item => item.remove());
        
        // 添加媒体项
        items.forEach((item, index) => {
            const mediaItem = this.createMediaItem(item, index, type);
            mediaList.appendChild(mediaItem);
        });
    }
    
    /**
     * 创建媒体项元素
     */
    createMediaItem(item, index, type) {
        const div = document.createElement('div');
        div.className = 'media-item';
        div.innerHTML = `
            <input type="checkbox" class="media-checkbox" data-index="${index}">
            <img class="media-preview" src="${item.src || item.url}" alt="${item.alt || '媒体文件'}" 
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNiAxNkgyNFYyNEgxNlYxNloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'">
            <div class="media-info">
                <div class="media-name" title="${item.name || item.src || item.url}">${this.getFileName(item.src || item.url)}</div>
                <div class="media-details">${this.getFileSize(item.size)} • ${this.getMediaTypeName(type)}</div>
            </div>
            <div class="media-actions">
                <button class="media-action-btn" onclick="window.sidePanelController.previewMedia('${item.src || item.url}')" title="预览">👁️</button>
                <button class="media-action-btn" onclick="window.sidePanelController.downloadMedia('${item.src || item.url}')" title="下载">⬇️</button>
                <button class="media-action-btn" onclick="window.sidePanelController.copyMediaUrl('${item.src || item.url}')" title="复制链接">📋</button>
            </div>
        `;
        return div;
    }
    
    /**
     * 更新媒体数量
     */
    updateMediaCounts() {
        const counts = {
            'imageCount': this.mediaCache.images.length,
            'videoCount': this.mediaCache.videos.length,
            'audioCount': this.mediaCache.audio.length
        };
        
        Object.entries(counts).forEach(([id, count]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = count.toString();
            }
        });
    }
    
    /**
     * 更新链接统计
     */
    async updateLinkStats() {
        try {
            if (!this.currentTab?.id) return;
            
            const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                type: 'GET_LINK_STATS'
            });
            
            if (response) {
                document.getElementById('totalLinks').textContent = response.total || '0';
                document.getElementById('externalLinks').textContent = response.external || '0';
                document.getElementById('internalLinks').textContent = response.internal || '0';
            }
        } catch (error) {
            console.error('[侧边栏] 更新链接统计失败:', error);
        }
    }
    
    /**
     * 保存设置
     */
    async saveSettings() {
        await chrome.storage.sync.set({ websiteToolsSettings: this.settings });
    }
    
    /**
     * 显示状态
     */
    showStatus(message, type = 'success') {
        const statusText = document.getElementById('statusText');
        const statusDot = document.getElementById('statusDot');
        
        if (statusText) {
            statusText.textContent = message;
        }
        
        if (statusDot) {
            statusDot.className = 'status-dot';
            if (type === 'error') {
                statusDot.style.background = '#ef4444';
            } else if (type === 'warning') {
                statusDot.style.background = '#f59e0b';
            } else {
                statusDot.style.background = '#10b981';
            }
        }
        
        // 3秒后恢复默认状态
        setTimeout(() => {
            if (statusText) statusText.textContent = '就绪';
            if (statusDot) statusDot.style.background = '#10b981';
        }, 3000);
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
    setButtonSuccess(button) {
        if (!button) return;
        
        button.classList.add('success');
        setTimeout(() => {
            button.classList.remove('success');
        }, 2000);
    }
    
    /**
     * 开始周期性更新
     */
    startPeriodicUpdate() {
        setInterval(() => {
            this.updateStats();
        }, 30000); // 每30秒更新一次
    }
    
    /**
     * 工具函数
     */
    getModuleName(module) {
        const names = {
            'copyFreedom': '复制自由',
            'linkManager': '链接管理',
            'mediaExtractor': '媒体提取'
        };
        return names[module] || module;
    }
    
    getMediaTypeName(type) {
        const names = {
            'images': '图片',
            'videos': '视频',
            'audio': '音频'
        };
        return names[type] || type;
    }
    
    getFileName(url) {
        try {
            return new URL(url).pathname.split('/').pop() || '未知文件';
        } catch {
            return '未知文件';
        }
    }
    
    getFileSize(size) {
        if (!size) return '未知大小';
        
        const units = ['B', 'KB', 'MB', 'GB'];
        let index = 0;
        while (size >= 1024 && index < units.length - 1) {
            size /= 1024;
            index++;
        }
        
        return `${size.toFixed(1)} ${units[index]}`;
    }
    
    /**
     * 媒体操作方法
     */
    async previewMedia(url) {
        // 在新标签页中预览
        chrome.tabs.create({ url: url });
    }
    
    async downloadMedia(url) {
        try {
            await chrome.downloads.download({ url: url });
            this.showStatus('开始下载');
        } catch (error) {
            console.error('[侧边栏] 下载失败:', error);
            this.showStatus('下载失败', 'error');
        }
    }
    
    async copyMediaUrl(url) {
        try {
            await navigator.clipboard.writeText(url);
            this.showStatus('链接已复制');
        } catch (error) {
            console.error('[侧边栏] 复制失败:', error);
            this.showStatus('复制失败', 'error');
        }
    }
    
    selectAllMedia() {
        const checkboxes = document.querySelectorAll('.media-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
    }
    
    async downloadSelectedMedia() {
        const checkboxes = document.querySelectorAll('.media-checkbox:checked');
        if (checkboxes.length === 0) {
            this.showStatus('请先选择要下载的文件', 'warning');
            return;
        }
        
        // 这里可以实现批量下载逻辑
        this.showStatus(`开始下载${checkboxes.length}个文件`);
    }
    
    clearMediaList() {
        this.mediaCache = { images: [], videos: [], audio: [] };
        this.updateMediaList('images');
        this.updateMediaCounts();
        this.showStatus('列表已清空');
    }
    
    refreshPage() {
        if (this.currentTab?.id) {
            chrome.tabs.reload(this.currentTab.id);
        }
    }
    
    exportSettings() {
        const dataStr = JSON.stringify(this.settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'website-tools-settings.json';
        link.click();
        URL.revokeObjectURL(url);
        this.showStatus('设置已导出');
    }
    
    importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const newSettings = JSON.parse(text);
                    this.settings = newSettings;
                    await this.saveSettings();
                    this.updateSettingsUI();
                    this.showStatus('设置已导入');
                } catch (error) {
                    this.showStatus('导入失败', 'error');
                }
            }
        };
        input.click();
    }
    
    showHelp() {
        const helpUrl = chrome.runtime.getURL('docs/user-guide.md');
        chrome.tabs.create({ url: helpUrl });
    }
}

// 全局实例
window.sidePanelController = null;

// 当DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.sidePanelController = new SidePanelController();
}); 