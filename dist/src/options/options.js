/**
 * 元气助手设置页面逻辑
 */

class OptionsController {
    constructor() {
        this.settings = {};
        this.whitelist = [];
        this.statistics = {};
        this.isDirty = false; // 标记是否有未保存的更改
        
        this.init();
    }
    
    /**
     * 初始化设置页面
     */
    async init() {
        try {
            // 加载设置
            await this.loadSettings();
            await this.loadWhitelist();
            await this.loadStatistics();
            
            // 初始化UI
            this.initUI();
            
            // 绑定事件
            this.bindEvents();
            
            console.log('[设置页面] 初始化完成');
        } catch (error) {
            console.error('[设置页面] 初始化失败:', error);
            this.showToast('初始化失败', 'error');
        }
    }
    
    /**
     * 加载设置
     */
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['websiteToolsSettings']);
            this.settings = result.websiteToolsSettings || this.getDefaultSettings();
        } catch (error) {
            console.error('[设置页面] 加载设置失败:', error);
            this.settings = this.getDefaultSettings();
        }
    }
    
    /**
     * 加载白名单
     */
    async loadWhitelist() {
        try {
            const result = await chrome.storage.sync.get(['websiteToolsWhitelist']);
            this.whitelist = result.websiteToolsWhitelist || [];
        } catch (error) {
            console.error('[设置页面] 加载白名单失败:', error);
            this.whitelist = [];
        }
    }
    
    /**
     * 加载统计数据
     */
    async loadStatistics() {
        try {
            const result = await chrome.storage.local.get(['websiteToolsStatistics']);
            this.statistics = result.websiteToolsStatistics || {
                totalUsageTime: 0,
                copyOperations: 0,
                mediaExtracted: 0,
                linksProcessed: 0
            };
        } catch (error) {
            console.error('[设置页面] 加载统计失败:', error);
            this.statistics = {
                totalUsageTime: 0,
                copyOperations: 0,
                mediaExtracted: 0,
                linksProcessed: 0
            };
        }
    }
    
    /**
     * 获取默认设置
     */
    getDefaultSettings() {
        return {
            general: {
                extensionEnabled: true,
                autoDetect: true,
                showNotifications: true,
                themeMode: 'auto',
                sidebarPosition: 'left'
            },
            copyFreedom: {
                enabled: true,
                textSelection: true,
                rightClickMenu: true,
                keyboardShortcuts: true,
                forceCopyMode: false,
                autoApply: true
            },
            linkManager: {
                enabled: true,
                newTabForExternal: true,
                linkPreview: false,
                previewDelay: 500,
                previewSize: 'medium'
            },
            mediaExtractor: {
                enabled: true,
                autoDetectImages: true,
                autoDetectVideos: false,
                autoDetectAudio: false,
                minImageSize: 50,
                supportedFormats: {
                    jpg: true,
                    png: true,
                    gif: true,
                    webp: false,
                    svg: false
                }
            },
            shortcuts: {
                toggleSidebar: '',
                toggleCopyFreedom: '',
                extractImages: ''
            },
            whitelist: {
                enabled: false
            }
        };
    }
    
    /**
     * 初始化UI
     */
    initUI() {
        // 更新所有设置项
        this.updateUI();
        
        // 更新白名单
        this.updateWhitelistUI();
        
        // 更新统计信息
        this.updateStatisticsUI();
        
        // 显示默认节
        this.showSection('general');
    }
    
    /**
     * 更新UI显示
     */
    updateUI() {
        // 通用设置
        this.setCheckbox('extensionEnabled', this.settings.general?.extensionEnabled ?? true);
        this.setCheckbox('autoDetect', this.settings.general?.autoDetect ?? true);
        this.setCheckbox('showNotifications', this.settings.general?.showNotifications ?? true);
        this.setSelectValue('themeMode', this.settings.general?.themeMode ?? 'auto');
        this.setRadioValue('sidebarPosition', this.settings.general?.sidebarPosition ?? 'left');
        
        // 复制自由设置
        this.setCheckbox('copyFreedomEnabled', this.settings.copyFreedom?.enabled ?? true);
        this.setCheckbox('textSelectionEnabled', this.settings.copyFreedom?.textSelection ?? true);
        this.setCheckbox('rightClickEnabled', this.settings.copyFreedom?.rightClickMenu ?? true);
        this.setCheckbox('keyboardShortcutsEnabled', this.settings.copyFreedom?.keyboardShortcuts ?? true);
        this.setCheckbox('forceCopyMode', this.settings.copyFreedom?.forceCopyMode ?? false);
        this.setCheckbox('autoApplyCopyFreedom', this.settings.copyFreedom?.autoApply ?? true);
        
        // 链接管理设置
        this.setCheckbox('linkManagerEnabled', this.settings.linkManager?.enabled ?? true);
        this.setCheckbox('newTabForExternal', this.settings.linkManager?.newTabForExternal ?? true);
        this.setCheckbox('linkPreviewEnabled', this.settings.linkManager?.linkPreview ?? false);
        this.setRangeValue('previewDelay', this.settings.linkManager?.previewDelay ?? 500);
        this.setSelectValue('previewSize', this.settings.linkManager?.previewSize ?? 'medium');
        
        // 媒体提取设置
        this.setCheckbox('mediaExtractorEnabled', this.settings.mediaExtractor?.enabled ?? true);
        this.setCheckbox('autoDetectImages', this.settings.mediaExtractor?.autoDetectImages ?? true);
        this.setCheckbox('autoDetectVideos', this.settings.mediaExtractor?.autoDetectVideos ?? false);
        this.setCheckbox('autoDetectAudio', this.settings.mediaExtractor?.autoDetectAudio ?? false);
        this.setNumberValue('minImageSize', this.settings.mediaExtractor?.minImageSize ?? 50);
        
        // 图片格式支持
        const formats = this.settings.mediaExtractor?.supportedFormats || {};
        document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach((checkbox, index) => {
            const formatNames = ['jpg', 'png', 'gif', 'webp', 'svg'];
            checkbox.checked = formats[formatNames[index]] ?? (index < 3);
        });
        
        // 白名单设置
        this.setCheckbox('enableWhitelist', this.settings.whitelist?.enabled ?? false);
    }
    
    /**
     * 更新白名单UI
     */
    updateWhitelistUI() {
        const siteList = document.getElementById('whitelistSites');
        if (!siteList) return;
        
        siteList.innerHTML = '';
        
        if (this.whitelist.length === 0) {
            siteList.innerHTML = '<div class="empty-state"><p>暂无白名单网站</p></div>';
            return;
        }
        
        this.whitelist.forEach((site, index) => {
            const siteItem = this.createSiteItem(site, index);
            siteList.appendChild(siteItem);
        });
    }
    
    /**
     * 创建网站项元素
     */
    createSiteItem(site, index) {
        const div = document.createElement('div');
        div.className = 'site-item';
        div.innerHTML = `
            <span class="site-domain">${site}</span>
            <div class="site-actions">
                <button class="site-btn danger" onclick="optionsController.removeSite(${index})">删除</button>
            </div>
        `;
        return div;
    }
    
    /**
     * 更新统计信息UI
     */
    updateStatisticsUI() {
        document.getElementById('totalUsageTime').textContent = 
            Math.round(this.statistics.totalUsageTime / 3600) || '0';
        document.getElementById('copyOperations').textContent = 
            this.statistics.copyOperations || '0';
        document.getElementById('mediaExtracted').textContent = 
            this.statistics.mediaExtracted || '0';
        document.getElementById('linksProcessed').textContent = 
            this.statistics.linksProcessed || '0';
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 导航按钮
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.showSection(section);
            });
        });
        
        // 头部按钮
        document.getElementById('saveBtn')?.addEventListener('click', () => {
            this.saveSettings();
        });
        
        document.getElementById('resetBtn')?.addEventListener('click', () => {
            this.resetToDefaults();
        });
        
        // 设置变更监听
        this.bindSettingEvents();
        
        // 白名单相关
        this.bindWhitelistEvents();
        
        // 备份恢复相关
        this.bindBackupEvents();
        
        // 快捷键设置
        this.bindShortcutEvents();
        
        // 范围滑块实时更新
        this.bindRangeEvents();
    }
    
    /**
     * 绑定设置变更事件
     */
    bindSettingEvents() {
        // 监听所有表单元素变化
        const formElements = document.querySelectorAll('input, select');
        formElements.forEach(element => {
            const eventType = element.type === 'range' ? 'input' : 'change';
            element.addEventListener(eventType, () => {
                this.isDirty = true;
                this.updateSettingsFromUI();
            });
        });
    }
    
    /**
     * 绑定白名单相关事件
     */
    bindWhitelistEvents() {
        document.getElementById('addSiteBtn')?.addEventListener('click', () => {
            this.addSite();
        });
        
        document.getElementById('newSiteInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addSite();
            }
        });
    }
    
    /**
     * 绑定备份恢复事件
     */
    bindBackupEvents() {
        document.getElementById('exportSettingsBtn')?.addEventListener('click', () => {
            this.exportSettings();
        });
        
        document.getElementById('importSettingsBtn')?.addEventListener('click', () => {
            this.importSettings();
        });
        
        document.getElementById('resetAllSettingsBtn')?.addEventListener('click', () => {
            this.resetAllSettings();
        });
    }
    
    /**
     * 绑定快捷键事件
     */
    bindShortcutEvents() {
        document.querySelectorAll('.shortcut-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const input = e.target.previousElementSibling;
                this.setShortcut(input);
            });
        });
    }
    
    /**
     * 绑定范围滑块事件
     */
    bindRangeEvents() {
        const rangeInput = document.getElementById('previewDelay');
        const rangeValue = rangeInput?.nextElementSibling;
        
        if (rangeInput && rangeValue) {
            rangeInput.addEventListener('input', () => {
                rangeValue.textContent = rangeInput.value + 'ms';
            });
        }
    }
    
    /**
     * 显示指定设置节
     */
    showSection(sectionName) {
        // 更新导航状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === sectionName);
        });
        
        // 显示对应内容
        document.querySelectorAll('.settings-section').forEach(section => {
            section.classList.toggle('active', section.id === sectionName + '-section');
        });
    }
    
    /**
     * 从UI更新设置
     */
    updateSettingsFromUI() {
        // 通用设置
        this.settings.general = {
            extensionEnabled: this.getCheckbox('extensionEnabled'),
            autoDetect: this.getCheckbox('autoDetect'),
            showNotifications: this.getCheckbox('showNotifications'),
            themeMode: this.getSelectValue('themeMode'),
            sidebarPosition: this.getRadioValue('sidebarPosition')
        };
        
        // 复制自由设置
        this.settings.copyFreedom = {
            enabled: this.getCheckbox('copyFreedomEnabled'),
            textSelection: this.getCheckbox('textSelectionEnabled'),
            rightClickMenu: this.getCheckbox('rightClickEnabled'),
            keyboardShortcuts: this.getCheckbox('keyboardShortcutsEnabled'),
            forceCopyMode: this.getCheckbox('forceCopyMode'),
            autoApply: this.getCheckbox('autoApplyCopyFreedom')
        };
        
        // 链接管理设置
        this.settings.linkManager = {
            enabled: this.getCheckbox('linkManagerEnabled'),
            newTabForExternal: this.getCheckbox('newTabForExternal'),
            linkPreview: this.getCheckbox('linkPreviewEnabled'),
            previewDelay: this.getRangeValue('previewDelay'),
            previewSize: this.getSelectValue('previewSize')
        };
        
        // 媒体提取设置
        const formatCheckboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
        const supportedFormats = {};
        const formatNames = ['jpg', 'png', 'gif', 'webp', 'svg'];
        formatCheckboxes.forEach((checkbox, index) => {
            supportedFormats[formatNames[index]] = checkbox.checked;
        });
        
        this.settings.mediaExtractor = {
            enabled: this.getCheckbox('mediaExtractorEnabled'),
            autoDetectImages: this.getCheckbox('autoDetectImages'),
            autoDetectVideos: this.getCheckbox('autoDetectVideos'),
            autoDetectAudio: this.getCheckbox('autoDetectAudio'),
            minImageSize: this.getNumberValue('minImageSize'),
            supportedFormats: supportedFormats
        };
        
        // 白名单设置
        this.settings.whitelist = {
            enabled: this.getCheckbox('enableWhitelist')
        };
    }
    
    /**
     * 保存设置
     */
    async saveSettings() {
        try {
            this.updateSettingsFromUI();
            
            await chrome.storage.sync.set({
                websiteToolsSettings: this.settings,
                websiteToolsWhitelist: this.whitelist
            });
            
            this.isDirty = false;
            this.showToast('设置已保存');
            
            // 通知所有标签页设置已更新
            const tabs = await chrome.tabs.query({});
            tabs.forEach(tab => {
                if (tab.url && !tab.url.startsWith('chrome://')) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'UPDATE_SETTINGS',
                        data: this.settings
                    }).catch(() => {
                        // 忽略无法发送消息的标签页
                    });
                }
            });
            
        } catch (error) {
            console.error('[设置页面] 保存设置失败:', error);
            this.showToast('保存失败', 'error');
        }
    }
    
    /**
     * 重置到默认设置
     */
    async resetToDefaults() {
        if (!confirm('确定要重置到默认设置吗？这将清除所有自定义配置。')) {
            return;
        }
        
        try {
            this.settings = this.getDefaultSettings();
            this.updateUI();
            this.isDirty = true;
            this.showToast('已重置到默认设置');
        } catch (error) {
            console.error('[设置页面] 重置设置失败:', error);
            this.showToast('重置失败', 'error');
        }
    }
    
    /**
     * 重置所有设置和数据
     */
    async resetAllSettings() {
        if (!confirm('确定要重置所有设置和数据吗？这将清除所有配置和统计信息，操作不可撤销。')) {
            return;
        }
        
        try {
            // 清除所有存储的数据
            await chrome.storage.sync.clear();
            await chrome.storage.local.clear();
            
            // 重新初始化
            this.settings = this.getDefaultSettings();
            this.whitelist = [];
            this.statistics = {
                totalUsageTime: 0,
                copyOperations: 0,
                mediaExtracted: 0,
                linksProcessed: 0
            };
            
            this.updateUI();
            this.updateWhitelistUI();
            this.updateStatisticsUI();
            
            this.isDirty = false;
            this.showToast('所有设置已重置');
        } catch (error) {
            console.error('[设置页面] 重置所有设置失败:', error);
            this.showToast('重置失败', 'error');
        }
    }
    
    /**
     * 添加网站到白名单
     */
    addSite() {
        const input = document.getElementById('newSiteInput');
        const site = input.value.trim();
        
        if (!site) {
            this.showToast('请输入网站域名', 'warning');
            return;
        }
        
        // 简单的域名验证
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
        if (!domainRegex.test(site)) {
            this.showToast('请输入有效的域名', 'warning');
            return;
        }
        
        if (this.whitelist.includes(site)) {
            this.showToast('该网站已在白名单中', 'warning');
            return;
        }
        
        this.whitelist.push(site);
        this.updateWhitelistUI();
        input.value = '';
        this.isDirty = true;
        this.showToast('网站已添加到白名单');
    }
    
    /**
     * 从白名单移除网站
     */
    removeSite(index) {
        if (index >= 0 && index < this.whitelist.length) {
            const site = this.whitelist[index];
            this.whitelist.splice(index, 1);
            this.updateWhitelistUI();
            this.isDirty = true;
            this.showToast(`已从白名单移除 ${site}`);
        }
    }
    
    /**
     * 设置快捷键
     */
    setShortcut(input) {
        const action = input.dataset.action;
        input.value = '按下快捷键...';
        input.style.background = '#fff3cd';
        
        let keys = [];
        
        const keyHandler = (e) => {
            e.preventDefault();
            
            keys = [];
            if (e.ctrlKey) keys.push('Ctrl');
            if (e.altKey) keys.push('Alt');
            if (e.shiftKey) keys.push('Shift');
            
            if (e.key && !['Control', 'Alt', 'Shift'].includes(e.key)) {
                keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
            }
            
            const shortcut = keys.join('+');
            input.value = shortcut;
            
            // 保存快捷键设置
            if (!this.settings.shortcuts) {
                this.settings.shortcuts = {};
            }
            this.settings.shortcuts[action.replace(/-/g, '')] = shortcut;
            this.isDirty = true;
            
            // 移除事件监听器并恢复样式
            document.removeEventListener('keydown', keyHandler);
            input.style.background = '';
            
            this.showToast('快捷键已设置');
        };
        
        document.addEventListener('keydown', keyHandler);
        
        // 5秒后自动取消
        setTimeout(() => {
            document.removeEventListener('keydown', keyHandler);
            input.value = this.settings.shortcuts?.[action.replace(/-/g, '')] || '';
            input.style.background = '';
        }, 5000);
    }
    
    /**
     * 导出设置
     */
    exportSettings() {
        try {
            const exportData = {
                settings: this.settings,
                whitelist: this.whitelist,
                exportTime: new Date().toISOString(),
                version: '1.0.0'
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `website-tools-settings-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            this.showToast('设置已导出');
        } catch (error) {
            console.error('[设置页面] 导出设置失败:', error);
            this.showToast('导出失败', 'error');
        }
    }
    
    /**
     * 导入设置
     */
    importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const importData = JSON.parse(text);
                
                // 验证数据格式
                if (!importData.settings || !importData.version) {
                    throw new Error('无效的设置文件格式');
                }
                
                this.settings = importData.settings;
                this.whitelist = importData.whitelist || [];
                
                this.updateUI();
                this.updateWhitelistUI();
                this.isDirty = true;
                
                this.showToast('设置已导入');
            } catch (error) {
                console.error('[设置页面] 导入设置失败:', error);
                this.showToast('导入失败：' + error.message, 'error');
            }
        };
        
        input.click();
    }
    
    /**
     * 显示Toast消息
     */
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const icon = toast.querySelector('.toast-icon');
        const messageEl = toast.querySelector('.toast-message');
        
        // 设置图标和样式
        if (type === 'error') {
            icon.textContent = '✗';
            toast.style.background = '#ea4335';
        } else if (type === 'warning') {
            icon.textContent = '⚠';
            toast.style.background = '#f59e0b';
        } else {
            icon.textContent = '✓';
            toast.style.background = '#4285f4';
        }
        
        messageEl.textContent = message;
        
        // 显示Toast
        toast.classList.add('show');
        
        // 3秒后隐藏
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    /**
     * UI辅助方法
     */
    setCheckbox(id, value) {
        const element = document.getElementById(id);
        if (element) element.checked = value;
    }
    
    getCheckbox(id) {
        const element = document.getElementById(id);
        return element ? element.checked : false;
    }
    
    setSelectValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value;
    }
    
    getSelectValue(id) {
        const element = document.getElementById(id);
        return element ? element.value : '';
    }
    
    setRadioValue(name, value) {
        const element = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (element) element.checked = true;
    }
    
    getRadioValue(name) {
        const element = document.querySelector(`input[name="${name}"]:checked`);
        return element ? element.value : '';
    }
    
    setRangeValue(id, value) {
        const element = document.getElementById(id);
        const valueDisplay = element?.nextElementSibling;
        if (element) {
            element.value = value;
            if (valueDisplay) {
                valueDisplay.textContent = value + 'ms';
            }
        }
    }
    
    getRangeValue(id) {
        const element = document.getElementById(id);
        return element ? parseInt(element.value) : 0;
    }
    
    setNumberValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value;
    }
    
    getNumberValue(id) {
        const element = document.getElementById(id);
        return element ? parseInt(element.value) || 0 : 0;
    }
}

// 全局实例
window.optionsController = null;

// 当DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.optionsController = new OptionsController();
    
    // 监听页面离开前的未保存警告
    window.addEventListener('beforeunload', (e) => {
        if (window.optionsController?.isDirty) {
            e.preventDefault();
            e.returnValue = '您有未保存的更改，确定要离开吗？';
        }
    });
}); 