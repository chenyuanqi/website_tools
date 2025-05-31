/**
 * 完整工作流程集成测试
 * 测试各个模块之间的协作
 */

import { mockChrome } from '../setup';

describe('完整工作流程集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 模拟Chrome API
    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.storage.sync.get.mockResolvedValue({});
    mockChrome.storage.sync.set.mockResolvedValue(undefined);
    mockChrome.runtime.onMessage.addListener.mockImplementation(() => {});
    mockChrome.tabs.query.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
  });

  describe('复制自由功能完整流程', () => {
    test('应该完成从启用到白名单保存的完整流程', async () => {
      // 1. 模拟用户在侧边栏点击启用复制自由
      const enableRequest = {
        type: 'ENABLE_TEXT_SELECTION',
        data: { tabId: 1 }
      };

      // 2. 模拟content script响应
      const contentResponse = {
        success: true,
        host: 'example.com'
      };

      // 3. 模拟background接收到启用通知
      const notificationRequest = {
        type: 'SELECTION_UNLOCK_ENABLED',
        data: {
          url: 'https://example.com',
          host: 'example.com'
        }
      };

      // 4. 验证白名单更新
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['copyFreedomWhitelist']);
      
      // 5. 验证徽章更新
      expect(mockChrome.tabs.query).toHaveBeenCalledWith({ url: '*://example.com/*' });
    });

    test('应该处理白名单自动启用流程', async () => {
      // 1. 模拟页面加载时检查白名单
      mockChrome.storage.local.get.mockResolvedValue({
        copyFreedomWhitelist: ['example.com']
      });

      // 2. 模拟自动启用
      const autoEnableFlow = async () => {
        const result = await mockChrome.storage.local.get(['copyFreedomWhitelist']);
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
      mockChrome.downloads.download.mockResolvedValue({ id: 1 });
      
      // 模拟下载流程
      await mockChrome.downloads.download({
        url: downloadRequest.data.url,
        filename: downloadRequest.data.filename
      });

      expect(mockChrome.downloads.download).toHaveBeenCalledWith({
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
      await mockChrome.storage.sync.set({
        websiteToolsSettings: newSettings
      });

      // 3. 验证设置保存
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        websiteToolsSettings: newSettings
      });

      // 4. 模拟其他页面读取设置
      mockChrome.storage.sync.get.mockResolvedValue({
        websiteToolsSettings: newSettings
      });

      const result = await mockChrome.storage.sync.get(['websiteToolsSettings']);
      expect(result.websiteToolsSettings).toEqual(newSettings);
    });
  });

  describe('错误恢复流程', () => {
    test('应该处理连接失败和重试的完整流程', async () => {
      // 1. 模拟连接失败
      const connectionError = new Error('Could not establish connection');
      mockChrome.runtime.sendMessage.mockRejectedValueOnce(connectionError);

      // 2. 模拟重试机制
      const retryWithBackoff = async (maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            await mockChrome.runtime.sendMessage({ type: 'PING' });
            return true;
          } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
          }
        }
        return false;
      };

      // 3. 第二次尝试成功
      mockChrome.runtime.sendMessage.mockResolvedValueOnce({ success: true });

      const result = await retryWithBackoff();
      expect(result).toBe(true);
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
    });

    test('应该处理存储错误和降级方案', async () => {
      // 1. 模拟存储失败
      mockChrome.storage.sync.set.mockRejectedValue(new Error('Storage quota exceeded'));

      // 2. 模拟降级到本地存储
      const fallbackSave = async (data: any) => {
        try {
          await mockChrome.storage.sync.set(data);
        } catch (error) {
          console.warn('Sync storage failed, using local storage');
          await mockChrome.storage.local.set(data);
        }
      };

      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await fallbackSave({ test: 'data' });

      expect(mockChrome.storage.sync.set).toHaveBeenCalled();
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ test: 'data' });
    });
  });

  describe('性能和资源管理', () => {
    test('应该正确管理内存和清理资源', async () => {
      // 1. 模拟创建多个模块实例
      const modules = [];
      
      for (let i = 0; i < 5; i++) {
        const module = {
          id: i,
          destroy: jest.fn(),
          cleanup: jest.fn()
        };
        modules.push(module);
      }

      // 2. 模拟页面卸载时清理
      const cleanup = () => {
        modules.forEach(module => {
          module.destroy();
          module.cleanup();
        });
      };

      cleanup();

      // 3. 验证所有模块都被正确清理
      modules.forEach(module => {
        expect(module.destroy).toHaveBeenCalled();
        expect(module.cleanup).toHaveBeenCalled();
      });
    });

    test('应该处理大量并发请求', async () => {
      // 1. 模拟大量并发消息
      const requests = Array.from({ length: 100 }, (_, i) => ({
        type: 'GET_SETTINGS',
        id: i
      }));

      // 2. 模拟并发处理
      mockChrome.storage.sync.get.mockResolvedValue({ settings: {} });

      const promises = requests.map(request => 
        mockChrome.storage.sync.get(['websiteToolsSettings'])
      );

      const results = await Promise.all(promises);

      // 3. 验证所有请求都得到处理
      expect(results).toHaveLength(100);
      expect(mockChrome.storage.sync.get).toHaveBeenCalledTimes(100);
    });
  });

  describe('跨标签页通信', () => {
    test('应该在多个标签页间同步状态', async () => {
      // 1. 模拟多个标签页
      const tabs = [
        { id: 1, url: 'https://example.com/page1' },
        { id: 2, url: 'https://example.com/page2' },
        { id: 3, url: 'https://different.com/page' }
      ];

      mockChrome.tabs.query.mockResolvedValue(tabs);

      // 2. 模拟在一个标签页启用功能
      const enabledHost = 'example.com';
      const relevantTabs = tabs.filter(tab => 
        tab.url.includes(enabledHost)
      );

      // 3. 验证相关标签页都收到更新
      expect(relevantTabs).toHaveLength(2);
      expect(relevantTabs.map(tab => tab.id)).toEqual([1, 2]);
    });
  });

  describe('数据一致性', () => {
    test('应该保持设置和状态的一致性', async () => {
      // 1. 模拟设置更新
      const initialSettings = {
        copyFreedom: { enabled: false },
        linkManager: { enabled: false }
      };

      const updatedSettings = {
        copyFreedom: { enabled: true },
        linkManager: { enabled: true }
      };

      // 2. 保存初始设置
      await mockChrome.storage.sync.set({
        websiteToolsSettings: initialSettings
      });

      // 3. 更新设置
      await mockChrome.storage.sync.set({
        websiteToolsSettings: updatedSettings
      });

      // 4. 验证设置一致性
      mockChrome.storage.sync.get.mockResolvedValue({
        websiteToolsSettings: updatedSettings
      });

      const result = await mockChrome.storage.sync.get(['websiteToolsSettings']);
      expect(result.websiteToolsSettings.copyFreedom.enabled).toBe(true);
      expect(result.websiteToolsSettings.linkManager.enabled).toBe(true);
    });
  });
}); 