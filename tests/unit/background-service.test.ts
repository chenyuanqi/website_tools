/**
 * Background Service单元测试
 * 测试消息处理和核心功能
 */

import { mockChrome } from '../setup';

// 模拟BackgroundService类（基于实际实现）
class MockBackgroundService {
  private handlers = new Map<string, Function>();
  private downloadQueue = new Map<string, any>();
  private usageStats = {
    copyFreedom: 0,
    linkManager: 0,
    mediaExtractor: 0
  };

  constructor() {
    this.setupMessageListener();
    this.registerHandlers();
  }

  private setupMessageListener(): void {
    mockChrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const handler = this.handlers.get(request.type);
      if (handler) {
        try {
          const result = handler(request, sender);
          if (result instanceof Promise) {
            result.then(sendResponse).catch((error) => {
              sendResponse({ success: false, error: error.message });
            });
            return true;
          } else {
            sendResponse(result);
          }
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
      }
    });
  }

  private registerHandlers(): void {
    this.handlers.set('ENABLE_TEXT_SELECTION', this.handleEnableTextSelection.bind(this));
    this.handlers.set('EXTRACT_IMAGES', this.handleExtractImages.bind(this));
    this.handlers.set('DOWNLOAD_ASSET', this.handleDownloadAsset.bind(this));
    this.handlers.set('GET_SETTINGS', this.handleGetSettings.bind(this));
    this.handlers.set('UPDATE_SETTINGS', this.handleUpdateSettings.bind(this));
    this.handlers.set('SELECTION_UNLOCK_ENABLED', this.handleSelectionUnlockEnabled.bind(this));
  }

  private async handleEnableTextSelection(request: any): Promise<any> {
    const { tabId } = request.data || {};
    
    if (tabId) {
      await mockChrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // 模拟启用文本选择的脚本
          console.log('启用文本选择');
        }
      });
    }

    return { success: true };
  }

  private async handleExtractImages(request: any): Promise<any> {
    // 模拟图片提取
    const mockImages = [
      { src: 'https://example.com/image1.jpg', alt: 'Image 1' },
      { src: 'https://example.com/image2.png', alt: 'Image 2' }
    ];

    return { images: mockImages, success: true };
  }

  private async handleDownloadAsset(request: any): Promise<any> {
    const { url, filename } = request.data;
    
    if (!url) {
      throw new Error('URL is required');
    }

    const downloadId = `download_${Date.now()}`;
    
    // 模拟下载
    const downloadItem = {
      id: downloadId,
      url,
      filename: filename || this.getFilenameFromUrl(url),
      state: 'in_progress'
    };

    this.downloadQueue.set(downloadId, downloadItem);

    // 模拟Chrome下载API
    await mockChrome.downloads.download({
      url,
      filename: downloadItem.filename
    });

    return { success: true, downloadId };
  }

  private async handleGetSettings(request: any): Promise<any> {
    const result = await mockChrome.storage.sync.get(['websiteToolsSettings']);
    return {
      settings: result.websiteToolsSettings || {},
      success: true
    };
  }

  private async handleUpdateSettings(request: any): Promise<any> {
    const { settings } = request.data;
    
    await mockChrome.storage.sync.set({
      websiteToolsSettings: settings
    });

    return { success: true };
  }

  private async handleSelectionUnlockEnabled(request: any): Promise<any> {
    const { url, host } = request.data;
    console.log('[Background] 文本选择解锁已启用:', host);
    
    // 更新统计
    this.updateUsageStats('copyFreedom');
    
    // 更新徽章状态
    const tabs = await mockChrome.tabs.query({ url: `*://${host}/*` });
    tabs.forEach(tab => {
      if (tab.id) {
        this.updateBadgeForHost(tab.id, host, true);
      }
    });
    
    return { success: true };
  }

  private updateUsageStats(feature: string): void {
    if (feature in this.usageStats) {
      (this.usageStats as any)[feature]++;
    }
  }

  private async updateBadgeForHost(tabId: number, host: string, enabled: boolean): Promise<void> {
    await mockChrome.action.setBadgeText({
      tabId,
      text: enabled ? '✓' : ''
    });

    await mockChrome.action.setBadgeBackgroundColor({
      tabId,
      color: enabled ? '#4CAF50' : '#FF5722'
    });
  }

  private getFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || 'download';
      
      // 如果没有扩展名，根据URL猜测
      if (!filename.includes('.')) {
        const contentType = this.guessContentType(url);
        return `${filename}.${contentType}`;
      }
      
      return filename;
    } catch {
      return 'download.bin';
    }
  }

  private guessContentType(url: string): string {
    if (url.includes('image') || /\.(jpg|jpeg|png|gif|webp)/.test(url)) {
      return 'jpg';
    } else if (url.includes('video') || /\.(mp4|webm|avi)/.test(url)) {
      return 'mp4';
    } else if (url.includes('audio') || /\.(mp3|wav|ogg)/.test(url)) {
      return 'mp3';
    }
    return 'bin';
  }

  public getUsageStats() {
    return this.usageStats;
  }

  public getDownloadQueue() {
    return this.downloadQueue;
  }
}

describe('BackgroundService', () => {
  let backgroundService: MockBackgroundService;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 模拟Chrome API
    mockChrome.downloads.download.mockResolvedValue({ id: 1 });
    mockChrome.storage.sync.get.mockResolvedValue({});
    mockChrome.storage.sync.set.mockResolvedValue(undefined);
    mockChrome.tabs.query.mockResolvedValue([{ id: 1 }]);
    mockChrome.scripting.executeScript.mockResolvedValue([]);
    mockChrome.action.setBadgeText.mockResolvedValue(undefined);
    mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

    // 创建服务实例
    backgroundService = new MockBackgroundService();
  });

  describe('消息处理', () => {
    test('应该注册消息监听器', () => {
      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });

    test('应该处理ENABLE_TEXT_SELECTION消息', async () => {
      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { type: 'ENABLE_TEXT_SELECTION', data: { tabId: 1 } },
        {},
        sendResponse
      );

      expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 1 },
        func: expect.any(Function)
      });
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('应该处理EXTRACT_IMAGES消息', async () => {
      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { type: 'EXTRACT_IMAGES' },
        {},
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({
        images: expect.arrayContaining([
          expect.objectContaining({ src: expect.any(String) })
        ]),
        success: true
      });
    });

    test('应该处理DOWNLOAD_ASSET消息', async () => {
      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'DOWNLOAD_ASSET', 
          data: { 
            url: 'https://example.com/image.jpg',
            filename: 'test-image.jpg'
          }
        },
        {},
        sendResponse
      );

      expect(mockChrome.downloads.download).toHaveBeenCalledWith({
        url: 'https://example.com/image.jpg',
        filename: 'test-image.jpg'
      });
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        downloadId: expect.any(String)
      });
    });

    test('应该处理GET_SETTINGS消息', async () => {
      const mockSettings = { copyFreedom: { enabled: true } };
      mockChrome.storage.sync.get.mockResolvedValue({ 
        websiteToolsSettings: mockSettings 
      });

      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { type: 'GET_SETTINGS' },
        {},
        sendResponse
      );

      expect(mockChrome.storage.sync.get).toHaveBeenCalledWith(['websiteToolsSettings']);
      expect(sendResponse).toHaveBeenCalledWith({
        settings: mockSettings,
        success: true
      });
    });

    test('应该处理UPDATE_SETTINGS消息', async () => {
      const newSettings = { copyFreedom: { enabled: false } };

      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'UPDATE_SETTINGS',
          data: { settings: newSettings }
        },
        {},
        sendResponse
      );

      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        websiteToolsSettings: newSettings
      });
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('应该处理SELECTION_UNLOCK_ENABLED消息', async () => {
      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'SELECTION_UNLOCK_ENABLED',
          data: { url: 'https://example.com', host: 'example.com' }
        },
        {},
        sendResponse
      );

      expect(mockChrome.tabs.query).toHaveBeenCalledWith({ url: '*://example.com/*' });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 1,
        text: '✓'
      });
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('应该处理未知消息类型', async () => {
      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { type: 'UNKNOWN_MESSAGE' },
        {},
        sendResponse
      );

      // 未知消息类型不应该调用sendResponse
      expect(sendResponse).not.toHaveBeenCalled();
    });
  });

  describe('下载功能', () => {
    test('应该正确处理下载请求', async () => {
      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'DOWNLOAD_ASSET',
          data: { url: 'https://example.com/test.jpg' }
        },
        {},
        sendResponse
      );

      const downloadQueue = backgroundService.getDownloadQueue();
      expect(downloadQueue.size).toBe(1);
      
      const downloadItem = Array.from(downloadQueue.values())[0];
      expect(downloadItem.url).toBe('https://example.com/test.jpg');
      expect(downloadItem.filename).toBe('test.jpg');
    });

    test('应该从URL生成文件名', async () => {
      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'DOWNLOAD_ASSET',
          data: { url: 'https://example.com/path/to/image.png' }
        },
        {},
        sendResponse
      );

      expect(mockChrome.downloads.download).toHaveBeenCalledWith({
        url: 'https://example.com/path/to/image.png',
        filename: 'image.png'
      });
    });

    test('应该为无扩展名的URL猜测文件类型', async () => {
      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'DOWNLOAD_ASSET',
          data: { url: 'https://example.com/image/12345' }
        },
        {},
        sendResponse
      );

      expect(mockChrome.downloads.download).toHaveBeenCalledWith({
        url: 'https://example.com/image/12345',
        filename: '12345.jpg' // 应该根据URL中的'image'猜测为jpg
      });
    });

    test('应该处理下载错误', async () => {
      mockChrome.downloads.download.mockRejectedValue(new Error('Download failed'));

      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'DOWNLOAD_ASSET',
          data: { url: 'https://example.com/test.jpg' }
        },
        {},
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Download failed'
      });
    });

    test('应该验证下载URL', async () => {
      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'DOWNLOAD_ASSET',
          data: {} // 缺少URL
        },
        {},
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'URL is required'
      });
    });
  });

  describe('徽章管理', () => {
    test('应该为启用的功能设置徽章', async () => {
      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'SELECTION_UNLOCK_ENABLED',
          data: { url: 'https://example.com', host: 'example.com' }
        },
        {},
        sendResponse
      );

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 1,
        text: '✓'
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 1,
        color: '#4CAF50'
      });
    });
  });

  describe('使用统计', () => {
    test('应该更新功能使用统计', async () => {
      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      // 触发复制自由功能
      await messageHandler(
        { 
          type: 'SELECTION_UNLOCK_ENABLED',
          data: { url: 'https://example.com', host: 'example.com' }
        },
        {},
        sendResponse
      );

      const stats = backgroundService.getUsageStats();
      expect(stats.copyFreedom).toBe(1);
    });
  });

  describe('设置管理', () => {
    test('应该返回默认设置当存储为空时', async () => {
      mockChrome.storage.sync.get.mockResolvedValue({});

      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { type: 'GET_SETTINGS' },
        {},
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({
        settings: {},
        success: true
      });
    });

    test('应该正确保存设置', async () => {
      const newSettings = {
        copyFreedom: { enabled: true, whitelist: ['example.com'] },
        linkManager: { newTabForExternal: true }
      };

      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'UPDATE_SETTINGS',
          data: { settings: newSettings }
        },
        {},
        sendResponse
      );

      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        websiteToolsSettings: newSettings
      });
    });

    test('应该处理设置保存错误', async () => {
      mockChrome.storage.sync.set.mockRejectedValue(new Error('Storage error'));

      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'UPDATE_SETTINGS',
          data: { settings: {} }
        },
        {},
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Storage error'
      });
    });
  });

  describe('文件类型检测', () => {
    test('应该正确检测图片类型', () => {
      const service = backgroundService as any;
      
      expect(service.guessContentType('https://example.com/image.jpg')).toBe('jpg');
      expect(service.guessContentType('https://example.com/photo.png')).toBe('jpg');
      expect(service.guessContentType('https://example.com/image/123')).toBe('jpg');
    });

    test('应该正确检测视频类型', () => {
      const service = backgroundService as any;
      
      expect(service.guessContentType('https://example.com/video.mp4')).toBe('mp4');
      expect(service.guessContentType('https://example.com/movie.webm')).toBe('mp4');
      expect(service.guessContentType('https://example.com/video/456')).toBe('mp4');
    });

    test('应该正确检测音频类型', () => {
      const service = backgroundService as any;
      
      expect(service.guessContentType('https://example.com/audio.mp3')).toBe('mp3');
      expect(service.guessContentType('https://example.com/song.wav')).toBe('mp3');
      expect(service.guessContentType('https://example.com/audio/789')).toBe('mp3');
    });

    test('应该为未知类型返回默认值', () => {
      const service = backgroundService as any;
      
      expect(service.guessContentType('https://example.com/document.pdf')).toBe('bin');
      expect(service.guessContentType('https://example.com/unknown')).toBe('bin');
    });
  });

  describe('错误处理', () => {
    test('应该处理消息处理器中的同步错误', async () => {
      // 模拟一个会抛出错误的处理器
      const service = backgroundService as any;
      service.handlers.set('ERROR_TEST', () => {
        throw new Error('Test error');
      });

      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { type: 'ERROR_TEST' },
        {},
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Test error'
      });
    });

    test('应该处理消息处理器中的异步错误', async () => {
      // 模拟一个会返回rejected Promise的处理器
      const service = backgroundService as any;
      service.handlers.set('ASYNC_ERROR_TEST', async () => {
        throw new Error('Async test error');
      });

      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { type: 'ASYNC_ERROR_TEST' },
        {},
        sendResponse
      );

      // 等待异步错误处理
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Async test error'
      });
    });
  });
}); 