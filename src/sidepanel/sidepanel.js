/**
 * 元气助手侧边栏逻辑 - 简化版（仅复制破解功能）
 */

class SidePanelController {
    constructor() {
        this.currentTab = null;
        this.settings = null;
        this.pageInfo = null;
        
        this.init();
    }
    
    /**
     * 初始化侧边栏
     */
    async init() {
        try {
            console.log('[侧边栏] 开始初始化...');
            
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
            
            console.log('[侧边栏] 初始化完成');
        } catch (error) {
            console.error('[侧边栏] 初始化失败:', error);
            this.showStatus('error', '初始化失败', error.message);
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
                copyFreedom: { enabled: true }
            };
        } catch (error) {
            console.error('[侧边栏] 加载设置失败:', error);
            this.settings = { copyFreedom: { enabled: true } };
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
            
            // 检查是否为特殊页面
            if (this.isSpecialPage(this.currentTab.url)) {
                this.pageInfo = {
                    url: this.currentTab.url,
                    title: this.currentTab.title,
                    domain: this.getDisplayDomain(this.currentTab.url),
                    isSpecialPage: true
                };
                return;
            }
            
            // 普通页面
            this.pageInfo = {
                url: this.currentTab.url,
                title: this.currentTab.title,
                domain: new URL(this.currentTab.url).hostname,
                isSpecialPage: false
            };
            
        } catch (error) {
            console.warn('[侧边栏] 获取页面信息失败:', error);
            this.pageInfo = {
                url: this.currentTab?.url || '',
                title: this.currentTab?.title || '',
                domain: this.getDisplayDomain(this.currentTab?.url),
                isSpecialPage: false,
                connectionError: true
            };
        }
    }
    
    /**
     * 检查是否为特殊页面
     */
    isSpecialPage(url) {
        if (!url) return true;
        
        const specialPagePrefixes = [
            'chrome://', 'chrome-extension://', 'moz-extension://',
            'edge://', 'about:', 'file://', 'data:', 'javascript:',
            'chrome-search://', 'chrome-devtools://'
        ];
        
        return specialPagePrefixes.some(prefix => url.startsWith(prefix));
    }
    
    /**
     * 获取显示用的域名
     */
    getDisplayDomain(url) {
        if (!url) return '未知';
        
        try {
            if (url.startsWith('chrome://')) return 'Chrome 内置页面';
            if (url.startsWith('chrome-extension://')) return 'Chrome 扩展页面';
            if (url.startsWith('about:')) return '浏览器页面';
            if (url.startsWith('file://')) return '本地文件';
            if (url.startsWith('data:')) return '数据页面';
            
            return new URL(url).hostname;
        } catch (e) {
            return '未知';
        }
    }
    
    /**
     * 初始化UI
     */
    initUI() {
        // 更新页面信息
        this.updatePageInfo();
        
        // 初始化状态
        this.updateStatus();
    }
    
    /**
     * 更新页面信息
     */
    updatePageInfo() {
        const domainElement = document.getElementById('pageDomain');
        const statusElement = document.getElementById('pageStatus');
        const currentDomainElement = document.getElementById('currentDomain');
        
        if (domainElement && this.pageInfo) {
            domainElement.textContent = this.pageInfo.domain;
            domainElement.title = this.pageInfo.url;
        }
        
        if (statusElement) {
            if (this.pageInfo?.isSpecialPage) {
                statusElement.textContent = '系统页面';
                statusElement.style.background = '#fce8e6';
                statusElement.style.color = '#d93025';
            } else if (this.pageInfo?.connectionError) {
                statusElement.textContent = '连接异常';
                statusElement.style.background = '#fef7e0';
                statusElement.style.color = '#ea8600';
            } else {
                statusElement.textContent = '就绪';
                statusElement.style.background = 'rgba(255, 255, 255, 0.2)';
                statusElement.style.color = 'white';
            }
        }
        
        if (currentDomainElement && this.pageInfo) {
            currentDomainElement.textContent = this.pageInfo.domain;
        }
    }
    
    /**
     * 更新状态
     */
    updateStatus() {
        const statusIndicator = document.getElementById('copyStatus');
        const footerStatus = document.getElementById('pageStatusFooter');
        
        if (statusIndicator) {
            if (this.pageInfo?.isSpecialPage) {
                statusIndicator.className = 'status-indicator error';
                statusIndicator.textContent = '系统页面';
            } else {
                statusIndicator.className = 'status-indicator';
                statusIndicator.textContent = '未启用';
            }
        }
        
        if (footerStatus) {
            footerStatus.textContent = this.pageInfo?.isSpecialPage ? '系统页面' : '就绪';
        }
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 一键破解按钮
        const unlockBtn = document.getElementById('unlockCopyBtn');
        if (unlockBtn) {
            unlockBtn.addEventListener('click', () => {
                this.unlockCopyRestrictions();
            });
        }
        
        // 头部按钮
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshPage();
            });
        }
        
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                chrome.runtime.openOptionsPage();
            });
        }
        
        // 页脚按钮
        const refreshPageBtn = document.getElementById('refreshPageBtn');
        if (refreshPageBtn) {
            refreshPageBtn.addEventListener('click', () => {
                this.refreshPage();
            });
        }
    }
    
    /**
     * 一键破解复制限制
     */
    async unlockCopyRestrictions() {
        const button = document.getElementById('unlockCopyBtn');
        const statusIndicator = document.getElementById('copyStatus');
        
        try {
            if (!this.currentTab?.id) {
                throw new Error('无法获取当前标签页');
            }
            
            // 检查是否为特殊页面
            if (this.pageInfo?.isSpecialPage) {
                this.showStatus('error', '系统页面', '系统页面无法破解复制限制');
                this.updateStepStatus('all', 'error', '系统页面');
                return;
            }
            
            // 设置加载状态
            this.setButtonLoading(button, true);
            this.updateStatusIndicator('loading', '破解中...');
            this.hideStatusMessage();
            
            // 重置所有步骤状态
            this.resetStepStatus();
            
            // 执行破解
            const response = await this.sendMessageWithRetry({
                type: 'enableTextSelection',
                data: { 
                    enabled: true,
                    mode: 'complete'
                }
            });
            
            if (response && response.success) {
                // 破解成功
                this.updateStatusIndicator('success', '已破解');
                this.showStatus('success', '破解成功', response.message || '复制限制已成功解除！');
                this.setButtonSuccess(button);
                
                // 更新步骤状态为成功
                this.updateStepStatus('all', 'success', '已完成');
                
            } else {
                // 破解失败但有响应
                const errorMsg = response?.error || response?.message || '破解失败，未知原因';
                this.updateStatusIndicator('error', '破解失败');
                this.showStatus('error', '破解失败', this.getDetailedErrorMessage(errorMsg));
                this.updateStepStatus('all', 'error', '失败');
            }
            
        } catch (error) {
            console.error('[侧边栏] 一键破解失败:', error);
            
            // 分析错误类型并提供详细信息
            let errorType = '连接失败';
            let errorDetail = '';
            
            if (error.message?.includes('Could not establish connection')) {
                errorType = '页面连接失败';
                errorDetail = '页面可能还未加载完成，请刷新页面后重试';
            } else if (error.message?.includes('Script not found')) {
                errorType = '脚本未就绪';
                errorDetail = '破解脚本未加载，请刷新页面后重试';
            } else if (error.message?.includes('Permission denied')) {
                errorType = '权限不足';
                errorDetail = '当前页面限制了扩展权限，无法破解';
            } else if (this.currentTab?.url?.startsWith('chrome://')) {
                errorType = '系统页面';
                errorDetail = 'Chrome系统页面无法破解';
            } else {
                errorDetail = error.message || '请刷新页面后重试，或检查网络连接';
            }
            
            this.updateStatusIndicator('error', errorType);
            this.showStatus('error', errorType, errorDetail);
            this.updateStepStatus('all', 'error', '失败');
            
        } finally {
            this.setButtonLoading(button, false);
        }
    }
    
    /**
     * 更新状态指示器
     */
    updateStatusIndicator(type, text) {
        const statusIndicator = document.getElementById('copyStatus');
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${type}`;
            statusIndicator.textContent = text;
        }
    }
    
    /**
     * 显示状态消息
     */
    showStatus(type, title, details) {
        const statusSection = document.getElementById('statusSection');
        const statusMessage = document.getElementById('statusMessage');
        const statusIcon = document.getElementById('statusIcon');
        const statusTitle = document.getElementById('statusTitle');
        const statusDetails = document.getElementById('statusDetails');
        
        if (statusSection && statusMessage) {
            statusMessage.className = `status-message ${type}`;
            statusSection.style.display = 'block';
        }
        
        if (statusIcon) {
            const icons = {
                success: '✅',
                error: '❌',
                info: 'ℹ️',
                loading: '⏳'
            };
            statusIcon.textContent = icons[type] || 'ℹ️';
        }
        
        if (statusTitle) {
            statusTitle.textContent = title;
        }
        
        if (statusDetails) {
            statusDetails.textContent = details;
        }
        
        // 成功消息5秒后自动隐藏
        if (type === 'success') {
            setTimeout(() => {
                this.hideStatusMessage();
            }, 5000);
        }
    }
    
    /**
     * 隐藏状态消息
     */
    hideStatusMessage() {
        const statusSection = document.getElementById('statusSection');
        if (statusSection) {
            statusSection.style.display = 'none';
        }
    }
    
    /**
     * 重置步骤状态
     */
    resetStepStatus() {
        for (let i = 1; i <= 5; i++) {
            this.updateStepStatus(i, '', '待执行');
        }
    }
    
    /**
     * 更新步骤状态
     */
    updateStepStatus(stepNumber, type, statusText) {
        if (stepNumber === 'all') {
            for (let i = 1; i <= 5; i++) {
                this.updateSingleStepStatus(i, type, statusText);
            }
        } else {
            this.updateSingleStepStatus(stepNumber, type, statusText);
        }
    }
    
    /**
     * 更新单个步骤状态
     */
    updateSingleStepStatus(stepNumber, type, statusText) {
        const stepElement = document.getElementById(`step${stepNumber}`);
        const statusElement = document.getElementById(`step${stepNumber}Status`);
        
        if (stepElement) {
            stepElement.className = `tech-step ${type}`;
        }
        
        if (statusElement) {
            statusElement.textContent = statusText;
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
    setButtonSuccess(button) {
        if (!button) return;
        
        const originalHtml = button.innerHTML;
        button.innerHTML = '<span class="btn-icon">✅</span><span class="btn-text">破解成功</span>';
        
        setTimeout(() => {
            button.innerHTML = originalHtml;
        }, 3000);
    }
    
    /**
     * 获取详细错误信息
     */
    getDetailedErrorMessage(error) {
        const errorMappings = {
            'CSS injection failed': 'CSS样式注入失败，页面可能有安全限制',
            'Script execution blocked': '脚本执行被阻止，页面有严格的内容安全策略',
            'Permission denied': '权限被拒绝，可能是HTTPS页面的安全限制',
            'Network error': '网络错误，请检查网络连接',
            'Timeout': '操作超时，页面响应缓慢',
            'Clone failed': 'DOM克隆失败，页面结构过于复杂',
            'Event listener patch failed': '事件监听器补丁失败，页面有特殊保护'
        };
        
        for (const [key, message] of Object.entries(errorMappings)) {
            if (error.includes(key)) {
                return message;
            }
        }
        
        return `${error}。建议：1. 刷新页面重试 2. 检查页面是否完全加载 3. 尝试强力模式`;
    }
    
    /**
     * 刷新页面
     */
    async refreshPage() {
        try {
            if (this.currentTab?.id) {
                await chrome.tabs.reload(this.currentTab.id);
                window.close(); // 关闭侧边栏
            }
        } catch (error) {
            console.error('[侧边栏] 刷新页面失败:', error);
        }
    }
    
    /**
     * 发送消息给Content Script（带重试机制）
     */
    async sendMessageWithRetry(message, maxRetries = 2) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[侧边栏] 发送消息 (第${attempt}次):`, message.type);
                
                // 设置超时时间
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('消息发送超时')), 3000);
                });
                
                const messagePromise = chrome.tabs.sendMessage(this.currentTab.id, message);
                
                const response = await Promise.race([messagePromise, timeoutPromise]);
                console.log('[侧边栏] 消息发送成功，收到响应:', response);
                return response;
                
            } catch (error) {
                console.warn(`[侧边栏] 第${attempt}次消息发送失败:`, error.message);
                
                if (attempt === maxRetries) {
                    console.error('[侧边栏] 所有重试都失败了');
                    throw new Error('无法建立连接：' + error.message);
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
    new SidePanelController();
});

// 监听标签页变化，重新初始化
chrome.tabs?.onActivated?.addListener(() => {
    setTimeout(() => {
        location.reload();
    }, 100);
}); 