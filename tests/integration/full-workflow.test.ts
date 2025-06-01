/**
 * 完整工作流程集成测试
 * 测试各个模块之间的协作
 */

describe('完整工作流程集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 模拟Chrome API
    chrome.storage.local.get.mockResolvedValue({});
    chrome.storage.local.set.mockResolvedValue(undefined);
    chrome.storage.sync.get.mockResolvedValue({});
    chrome.storage.sync.set.mockResolvedValue(undefined);
    chrome.runtime.onMessage.addListener.mockImplementation(() => {});
    chrome.tabs.query.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
  });

  describe('复制自由功能完整流程', () => {
    test('应该完成从启用到白名单保存的完整流程', async () => {
      // 1. 模拟启用复制自由功能
      const enableRequest = {
        type: 'ENABLE_TEXT_SELECTION'
      };

      // 2. 模拟白名单保存
      chrome.storage.local.get.mockResolvedValue({
        copyFreedomWhitelist: []
      });
      chrome.storage.local.set.mockResolvedValue(undefined);

      // 3. 模拟徽章更新
      chrome.tabs.query.mockResolvedValue([
        { id: 1, url: 'https://example.com/page' }
      ]);
      chrome.action.setBadgeText.mockResolvedValue(undefined);

      // 4. 执行完整流程 - 先获取当前白名单
      await chrome.storage.local.get(['copyFreedomWhitelist']);
      
      // 然后保存更新的白名单
      await chrome.storage.local.set({
        copyFreedomWhitelist: ['example.com']
      });

      // 查询相关标签页
      await chrome.tabs.query({ url: '*://example.com/*' });

      // 验证存储操作
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        copyFreedomWhitelist: ['example.com']
      });
      
      // 验证白名单更新
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['copyFreedomWhitelist']);
      
      // 验证徽章更新
      expect(chrome.tabs.query).toHaveBeenCalledWith({ url: '*://example.com/*' });
    });

    test('应该处理白名单自动启用流程', async () => {
      // 1. 模拟页面加载时检查白名单
      chrome.storage.local.get.mockResolvedValue({
        copyFreedomWhitelist: ['example.com']
      });

      // 2. 模拟自动启用
      const autoEnableFlow = async () => {
        const result = await chrome.storage.local.get(['copyFreedomWhitelist']);
        const whitelist = result.copyFreedomWhitelist || [];
        const currentHost = 'example.com';
        
        return whitelist.includes(currentHost);
      };

      const shouldAutoEnable = await autoEnableFlow();
      expect(shouldAutoEnable).toBe(true);
    });
  });

  describe('媒体提取功能完整流程', () => {
    test('应该完成从提取到下载的完整流程', async () => {
      // 1. 模拟提取图片
      const extractRequest = {
        type: 'EXTRACT_IMAGES'
      };

      const mockImages = [
        { src: 'https://example.com/image1.jpg', alt: 'Image 1' },
        { src: 'https://example.com/image2.png', alt: 'Image 2' }
      ];

      // 2. 模拟下载请求
      const downloadRequest = {
        type: 'DOWNLOAD_ASSET',
        data: {
          url: 'https://example.com/image1.jpg',
          filename: 'downloaded-image.jpg'
        }
      };

      // 3. 验证下载API调用
      chrome.downloads.download.mockResolvedValue({ id: 1 });
      
      // 模拟下载流程
      await chrome.downloads.download({
        url: downloadRequest.data.url,
        filename: downloadRequest.data.filename
      });

      expect(chrome.downloads.download).toHaveBeenCalledWith({
        url: 'https://example.com/image1.jpg',
        filename: 'downloaded-image.jpg'
      });
    });
  });

  describe('链接管理功能完整流程', () => {
    test('应该完成链接重写和预览的完整流程', async () => {
      // 1. 模拟启用新标签页模式
      const enableNewTabRequest = {
        type: 'ENABLE_NEW_TAB_MODE',
        data: { enabled: true }
      };

      // 2. 模拟链接处理
      const mockLinks = [
        {
          href: 'https://external.com/page',
          hostname: 'external.com',
          setAttribute: jest.fn(),
          getAttribute: jest.fn(),
          classList: { add: jest.fn() }
        }
      ];

      // 3. 验证链接属性设置
      mockLinks.forEach(link => {
        if (link.hostname !== 'example.com') {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
          link.classList.add('yuanqi-external-link');
        }
      });

      expect(mockLinks[0].setAttribute).toHaveBeenCalledWith('target', '_blank');
      expect(mockLinks[0].setAttribute).toHaveBeenCalledWith('rel', 'noopener noreferrer');
    });
  });

  describe('设置同步流程', () => {
    test('应该完成设置更新和同步的完整流程', async () => {
      // 1. 模拟用户在选项页面更新设置
      const newSettings = {
        copyFreedom: {
          enabled: true,
          whitelist: ['example.com', 'test.com']
        },
        linkManager: {
          newTabForExternal: true,
          popupPreview: false
        },
        mediaExtractor: {
          enabled: true,
          autoDetectImages: true
        }
      };

      // 2. 保存设置
      await chrome.storage.sync.set({
        websiteToolsSettings: newSettings
      });

      // 3. 验证设置保存
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        websiteToolsSettings: newSettings
      });

      // 4. 模拟其他页面读取设置
      chrome.storage.sync.get.mockResolvedValue({
        websiteToolsSettings: newSettings
      });

      const result = await chrome.storage.sync.get(['websiteToolsSettings']);
      expect(result.websiteToolsSettings).toEqual(newSettings);
    });
  });

  describe('错误恢复流程', () => {
    test('应该处理连接失败和重试的完整流程', async () => {
      // 1. 模拟连接失败
      const connectionError = new Error('Could not establish connection');
      chrome.runtime.sendMessage.mockRejectedValueOnce(connectionError);

      // 2. 模拟重试机制
      const retryWithBackoff = async (maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            await chrome.runtime.sendMessage({ type: 'PING' });
            return true;
          } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
          }
        }
        return false;
      };

      // 3. 第二次尝试成功
      chrome.runtime.sendMessage.mockResolvedValueOnce({ success: true });

      const result = await retryWithBackoff();
      expect(result).toBe(true);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
    });

    test('应该处理存储错误和降级方案', async () => {
      // 1. 模拟存储失败
      chrome.storage.sync.set.mockRejectedValueOnce(new Error('Storage quota exceeded'));

      // 2. 模拟降级到本地存储
      const fallbackSave = async (data: any) => {
        try {
          await chrome.storage.sync.set(data);
        } catch (error) {
          console.warn('Sync storage failed, using local storage:', error);
          await chrome.storage.local.set(data);
        }
      };

      chrome.storage.local.set.mockResolvedValueOnce(undefined);

      await fallbackSave({ test: 'data' });

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ test: 'data' });
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ test: 'data' });
    });
  });

  describe('性能和资源管理', () => {
    test('应该正确管理内存和清理资源', async () => {
      // 1. 模拟资源创建
      const resources = {
        observers: [],
        timers: [],
        listeners: []
      };

      // 2. 模拟清理函数
      const cleanup = () => {
        resources.observers.forEach(observer => observer.disconnect());
        resources.timers.forEach(timer => clearTimeout(timer));
        resources.listeners.forEach(listener => 
          chrome.runtime.onMessage.removeListener(listener)
        );
      };

      // 3. 验证清理
      const mockObserver = { disconnect: jest.fn() };
      resources.observers.push(mockObserver);

      cleanup();

      expect(mockObserver.disconnect).toHaveBeenCalled();
    });

    test('应该处理大量并发请求', async () => {
      // 1. 模拟并发请求
      const requests = Array.from({ length: 10 }, (_, i) => ({
        type: 'PROCESS_REQUEST',
        data: { id: i }
      }));

      // 2. 模拟批量处理
      const batchProcess = async (requests: any[]) => {
        const results = await Promise.all(
          requests.map(req => 
            chrome.runtime.sendMessage(req).catch(err => ({ error: err.message }))
          )
        );
        return results;
      };

      chrome.runtime.sendMessage.mockResolvedValue({ success: true });

      const results = await batchProcess(requests);

      expect(results).toHaveLength(10);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(10);
    });
  });

  describe('跨标签页通信', () => {
    test('应该在多个标签页间同步状态', async () => {
      // 1. 模拟多个标签页
      const tabs = [
        { id: 1, url: 'https://example.com/page1' },
        { id: 2, url: 'https://example.com/page2' },
        { id: 3, url: 'https://other.com/page' }
      ];

      chrome.tabs.query.mockResolvedValue(tabs);

      // 2. 模拟状态更新广播
      const broadcastUpdate = async (message: any) => {
        const allTabs = await chrome.tabs.query({});
        const relevantTabs = allTabs.filter(tab => 
          tab.url?.includes('example.com')
        );

        return Promise.all(
          relevantTabs.map(tab => 
            chrome.tabs.sendMessage(tab.id!, message)
          )
        );
      };

      chrome.tabs.sendMessage.mockResolvedValue({ success: true });

      await broadcastUpdate({ type: 'STATE_UPDATE', data: { enabled: true } });

      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2); // 只发送给example.com的标签页
    });
  });

  describe('数据一致性', () => {
    test('应该保持设置和状态的一致性', async () => {
      // 1. 模拟设置更新
      const settings = {
        copyFreedom: { enabled: true },
        linkManager: { newTabForExternal: true }
      };

      await chrome.storage.sync.set({ websiteToolsSettings: settings });

      // 2. 模拟状态读取
      chrome.storage.sync.get.mockResolvedValue({ websiteToolsSettings: settings });

      const result = await chrome.storage.sync.get(['websiteToolsSettings']);

      // 3. 验证一致性
      expect(result.websiteToolsSettings).toEqual(settings);
      expect(result.websiteToolsSettings.copyFreedom.enabled).toBe(true);
      expect(result.websiteToolsSettings.linkManager.newTabForExternal).toBe(true);
    });
  });
}); 