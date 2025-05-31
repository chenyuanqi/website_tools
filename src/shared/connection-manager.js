/**
 * 连接管理器 - 处理扩展与页面的连接问题
 */

class ConnectionManager {
    constructor() {
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.connectionTimeout = 3000;
    }
    
    /**
     * 检查Content Script是否已注入
     */
    async checkContentScriptInjected(tabId) {
        try {
            const response = await this.sendMessageWithTimeout(tabId, {
                type: 'PING'
            }, 1000);
            
            return response && response.pong === true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * 带超时的消息发送
     */
    async sendMessageWithTimeout(tabId, message, timeout = 3000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('消息发送超时'));
            }, timeout);
            
            chrome.tabs.sendMessage(tabId, message, (response) => {
                clearTimeout(timer);
                
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }
    
    /**
     * 主动注入Content Script
     */
    async injectContentScript(tabId) {
        try {
            console.log('[连接管理器] 开始注入Content Script到标签页:', tabId);
            
            // 检查是否有scripting权限
            if (!chrome.scripting) {
                throw new Error('缺少scripting权限');
            }
            
            // 获取标签页信息
            const tab = await chrome.tabs.get(tabId);
            
            // 检查是否为特殊页面
            if (this.isSpecialPage(tab.url)) {
                throw new Error('特殊页面不支持注入');
            }
            
            // 注入Content Script
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['src/content/main-simple.js']
            });
            
            console.log('[连接管理器] Content Script注入成功');
            
            // 等待一段时间让脚本初始化
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 验证注入是否成功
            const isInjected = await this.checkContentScriptInjected(tabId);
            if (!isInjected) {
                throw new Error('注入验证失败');
            }
            
            return true;
            
        } catch (error) {
            console.error('[连接管理器] 注入Content Script失败:', error);
            throw error;
        }
    }
    
    /**
     * 带重试机制的消息发送
     */
    async sendMessageWithRetry(tabId, message, options = {}) {
        const maxRetries = options.maxRetries || this.retryAttempts;
        const retryDelay = options.retryDelay || this.retryDelay;
        const timeout = options.timeout || this.connectionTimeout;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[连接管理器] 发送消息 (第${attempt}次):`, message.type);
                
                const response = await this.sendMessageWithTimeout(tabId, message, timeout);
                console.log('[连接管理器] 消息发送成功，收到响应:', response);
                return response;
                
            } catch (error) {
                console.warn(`[连接管理器] 第${attempt}次消息发送失败:`, error.message);
                
                if (attempt === maxRetries) {
                    // 最后一次尝试失败，尝试重新注入
                    console.log('[连接管理器] 所有重试失败，尝试重新注入Content Script');
                    try {
                        await this.injectContentScript(tabId);
                        
                        // 注入后再尝试一次
                        const response = await this.sendMessageWithTimeout(tabId, message, timeout);
                        console.log('[连接管理器] 重新注入后消息发送成功:', response);
                        return response;
                    } catch (injectError) {
                        console.error('[连接管理器] 重新注入后仍然失败:', injectError);
                        throw new Error('无法建立连接，请手动刷新页面');
                    }
                } else {
                    // 等待一段时间后重试
                    await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                }
            }
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
            'chrome-devtools://',
            'chrome-error://'
        ];
        
        return specialPagePrefixes.some(prefix => url.startsWith(prefix));
    }
    
    /**
     * 获取连接状态
     */
    async getConnectionStatus(tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);
            
            if (this.isSpecialPage(tab.url)) {
                return {
                    connected: false,
                    reason: 'special_page',
                    message: '当前页面不支持扩展功能',
                    canRetry: false
                };
            }
            
            const isConnected = await this.checkContentScriptInjected(tabId);
            
            if (isConnected) {
                return {
                    connected: true,
                    reason: 'success',
                    message: '连接正常',
                    canRetry: false
                };
            } else {
                return {
                    connected: false,
                    reason: 'not_injected',
                    message: '内容脚本未注入',
                    canRetry: true
                };
            }
            
        } catch (error) {
            return {
                connected: false,
                reason: 'error',
                message: error.message,
                canRetry: true
            };
        }
    }
    
    /**
     * 尝试修复连接
     */
    async repairConnection(tabId) {
        try {
            console.log('[连接管理器] 开始修复连接...');
            
            const status = await this.getConnectionStatus(tabId);
            
            if (status.connected) {
                console.log('[连接管理器] 连接正常，无需修复');
                return true;
            }
            
            if (!status.canRetry) {
                console.log('[连接管理器] 无法修复连接:', status.message);
                return false;
            }
            
            // 尝试注入Content Script
            await this.injectContentScript(tabId);
            
            // 验证修复结果
            const newStatus = await this.getConnectionStatus(tabId);
            
            if (newStatus.connected) {
                console.log('[连接管理器] 连接修复成功');
                return true;
            } else {
                console.log('[连接管理器] 连接修复失败:', newStatus.message);
                return false;
            }
            
        } catch (error) {
            console.error('[连接管理器] 修复连接时出错:', error);
            return false;
        }
    }
}

// 创建全局实例
window.connectionManager = new ConnectionManager();

// 导出类和实例
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ConnectionManager, connectionManager: window.connectionManager };
} 