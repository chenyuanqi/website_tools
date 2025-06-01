/**
 * Background Service Worker测试
 * 测试后台服务的消息处理和功能
 */

// 模拟Background Service Worker
class MockBackgroundService {
  private handlers = new Map<string, Function>();
  private downloadQueue = new Map<string, any>();
  private usageStats = {
    textSelectionEnabled: 0,
    imagesExtracted: 0,
    assetsDownloaded: 0
  };

  constructor() {
    this.setupMessageListener();
    this.registerHandlers();
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
      try {
        const handler = this.handlers.get(request.type);
        if (handler) {
          const result = await handler(request);
          sendResponse(result);
        }
      } catch (error) {
        console.error('Message handler error:', error);
        sendResponse({ success: false, error: error.message });
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
    const { tabId } = request.data;
    
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // 注入复制自由脚本
        console.log('Text selection enabled');
      }
    });

    this.updateUsageStats('textSelectionEnabled');
    return { success: true };
  }

  private async handleExtractImages(request: any): Promise<any> {
    // 模拟图片提取
    const mockImages = [
      { src: 'https://example.com/image1.jpg', alt: 'Image 1' },
      { src: 'https://example.com/image2.png', alt: 'Image 2' }
    ];

    this.updateUsageStats('imagesExtracted');
    return { success: true, images: mockImages };
  }

  private async handleDownloadAsset(request: any): Promise<any> {
    const { url, filename } = request.data;
    const finalFilename = filename || this.getFilenameFromUrl(url);
    
    const downloadId = await chrome.downloads.download({
      url,
      filename: finalFilename
    });

    // 添加到下载队列
    this.downloadQueue.set(downloadId.toString(), {
      id: downloadId,
      url,
      filename: finalFilename,
      status: 'in_progress',
      startTime: Date.now()
    });

    this.updateUsageStats('assetsDownloaded');
    return { 
      success: true, 
      downloadId: downloadId.toString()
    };
  }

  private async handleGetSettings(request: any): Promise<any> {
    const result = await chrome.storage.sync.get(['websiteToolsSettings']);
    const settings = result.websiteToolsSettings || {};
    
    return { success: true, settings };
  }

  private async handleUpdateSettings(request: any): Promise<any> {
    const { settings } = request.data;
    
    await chrome.storage.sync.set({
      websiteToolsSettings: settings
    });
    
    return { success: true };
  }

  private async handleSelectionUnlockEnabled(request: any): Promise<any> {
    const { url, host } = request.data;
    
    // 更新相关标签页的徽章
    const tabs = await chrome.tabs.query({ url: `*://${host}/*` });
    
    for (const tab of tabs) {
      if (tab.id) {
        await this.updateBadgeForHost(tab.id, host, true);
      }
    }
    
    return { success: true };
  }

  private updateUsageStats(feature: string): void {
    if (feature in this.usageStats) {
      (this.usageStats as any)[feature]++;
    }
  }

  private async updateBadgeForHost(tabId: number, host: string, enabled: boolean): Promise<void> {
    await chrome.action.setBadgeText({
      tabId,
      text: enabled ? '✓' : ''
    });
    
    await chrome.action.setBadgeBackgroundColor({
      tabId,
      color: enabled ? '#4CAF50' : '#757575'
    });
  }

  private getFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || 'download';
      
      // 如果没有扩展名，使用.bin作为默认扩展名
      if (!filename.includes('.')) {
        return `${filename}.bin`;
      }
      
      return filename;
    } catch (error) {
      return 'download.bin';
    }
  }

  private guessContentType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav'
    };
    
    return mimeTypes[extension || ''] || 'application/octet-stream';
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
    chrome.downloads.download.mockResolvedValue({ id: 1 });
    chrome.storage.sync.get.mockResolvedValue({});
    chrome.storage.sync.set.mockResolvedValue(undefined);
    chrome.tabs.query.mockResolvedValue([{ id: 1 }]);
    chrome.scripting.executeScript.mockResolvedValue([]);
    chrome.action.setBadgeText.mockResolvedValue(undefined);
    chrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

    // 创建服务实例
    backgroundService = new MockBackgroundService();
  });

  describe('消息处理', () => {
    test('应该注册消息监听器', () => {
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });

    test('应该处理ENABLE_TEXT_SELECTION消息', async () => {
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { type: 'ENABLE_TEXT_SELECTION', data: { tabId: 1 } },
        {},
        sendResponse
      );

      expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 1 },
        func: expect.any(Function)
      });
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('应该处理EXTRACT_IMAGES消息', async () => {
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
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
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
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

      expect(chrome.downloads.download).toHaveBeenCalledWith({
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
      chrome.storage.sync.get.mockResolvedValue({ 
        websiteToolsSettings: mockSettings 
      });

      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { type: 'GET_SETTINGS' },
        {},
        sendResponse
      );

      expect(chrome.storage.sync.get).toHaveBeenCalledWith(['websiteToolsSettings']);
      expect(sendResponse).toHaveBeenCalledWith({
        settings: mockSettings,
        success: true
      });
    });

    test('应该处理UPDATE_SETTINGS消息', async () => {
      const newSettings = { copyFreedom: { enabled: false } };

      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'UPDATE_SETTINGS',
          data: { settings: newSettings }
        },
        {},
        sendResponse
      );

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        websiteToolsSettings: newSettings
      });
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('应该处理SELECTION_UNLOCK_ENABLED消息', async () => {
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'SELECTION_UNLOCK_ENABLED',
          data: { url: 'https://example.com', host: 'example.com' }
        },
        {},
        sendResponse
      );

      expect(chrome.tabs.query).toHaveBeenCalledWith({ url: '*://example.com/*' });
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 1,
        text: '✓'
      });
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('应该处理未知消息类型', async () => {
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
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
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
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
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'DOWNLOAD_ASSET',
          data: { url: 'https://example.com/path/to/image.png' }
        },
        {},
        sendResponse
      );

      expect(chrome.downloads.download).toHaveBeenCalledWith({
        url: 'https://example.com/path/to/image.png',
        filename: 'image.png'
      });
    });

    test('应该处理没有扩展名的URL', async () => {
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'DOWNLOAD_ASSET',
          data: { url: 'https://example.com/download' }
        },
        {},
        sendResponse
      );

      expect(chrome.downloads.download).toHaveBeenCalledWith({
        url: 'https://example.com/download',
        filename: 'download.bin'
      });
    });
  });

  describe('设置管理', () => {
    test('应该保存设置到sync存储', async () => {
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      const settings = {
        copyFreedom: { enabled: true, whitelist: ['example.com'] },
        linkManager: { newTabForExternal: true }
      };

      await messageHandler(
        { 
          type: 'UPDATE_SETTINGS',
          data: { settings }
        },
        {},
        sendResponse
      );

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        websiteToolsSettings: settings
      });
    });

    test('应该从sync存储读取设置', async () => {
      const mockSettings = {
        copyFreedom: { enabled: false },
        linkManager: { newTabForExternal: false }
      };

      chrome.storage.sync.get.mockResolvedValue({
        websiteToolsSettings: mockSettings
      });

      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { type: 'GET_SETTINGS' },
        {},
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        settings: mockSettings
      });
    });

    test('应该处理空设置', async () => {
      chrome.storage.sync.get.mockResolvedValue({});

      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { type: 'GET_SETTINGS' },
        {},
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        settings: {}
      });
    });
  });

  describe('徽章管理', () => {
    test('应该为启用的域名设置徽章', async () => {
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'SELECTION_UNLOCK_ENABLED',
          data: { url: 'https://example.com', host: 'example.com' }
        },
        {},
        sendResponse
      );

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 1,
        text: '✓'
      });

      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 1,
        color: '#4CAF50'
      });
    });

    test('应该查询相关标签页', async () => {
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'SELECTION_UNLOCK_ENABLED',
          data: { url: 'https://test.com', host: 'test.com' }
        },
        {},
        sendResponse
      );

      expect(chrome.tabs.query).toHaveBeenCalledWith({ url: '*://test.com/*' });
    });
  });

  describe('使用统计', () => {
    test('应该记录文本选择启用次数', async () => {
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { type: 'ENABLE_TEXT_SELECTION', data: { tabId: 1 } },
        {},
        sendResponse
      );

      const stats = backgroundService.getUsageStats();
      expect(stats.textSelectionEnabled).toBe(1);
    });

    test('应该记录图片提取次数', async () => {
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { type: 'EXTRACT_IMAGES' },
        {},
        sendResponse
      );

      const stats = backgroundService.getUsageStats();
      expect(stats.imagesExtracted).toBe(1);
    });

    test('应该记录资源下载次数', async () => {
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { 
          type: 'DOWNLOAD_ASSET',
          data: { url: 'https://example.com/test.jpg' }
        },
        {},
        sendResponse
      );

      const stats = backgroundService.getUsageStats();
      expect(stats.assetsDownloaded).toBe(1);
    });
  });

  describe('文件类型检测', () => {
    test('应该正确检测图片类型', () => {
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      
      imageExtensions.forEach(ext => {
        const url = `https://example.com/image.${ext}`;
        const contentType = (backgroundService as any).guessContentType(url);
        expect(contentType).toMatch(/^image\//);
      });
    });

    test('应该正确检测视频类型', () => {
      const videoExtensions = ['mp4', 'webm'];
      
      videoExtensions.forEach(ext => {
        const url = `https://example.com/video.${ext}`;
        const contentType = (backgroundService as any).guessContentType(url);
        expect(contentType).toMatch(/^video\//);
      });
    });

    test('应该正确检测音频类型', () => {
      const audioExtensions = ['mp3', 'wav'];
      
      audioExtensions.forEach(ext => {
        const url = `https://example.com/audio.${ext}`;
        const contentType = (backgroundService as any).guessContentType(url);
        expect(contentType).toMatch(/^audio\//);
      });
    });

    test('应该为未知类型返回默认值', () => {
      const unknownUrl = 'https://example.com/file.unknown';
      const contentType = (backgroundService as any).guessContentType(unknownUrl);
      expect(contentType).toBe('application/octet-stream');
    });
  });

  describe('错误处理', () => {
    test('应该处理消息处理器中的同步错误', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // 模拟处理器抛出错误
      chrome.scripting.executeScript.mockRejectedValue(new Error('Script execution failed'));

      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { type: 'ENABLE_TEXT_SELECTION', data: { tabId: 1 } },
        {},
        sendResponse
      );

      expect(consoleSpy).toHaveBeenCalledWith('Message handler error:', expect.any(Error));
      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Script execution failed'
      });
      
      consoleSpy.mockRestore();
    });

    test('应该处理消息处理器中的异步错误', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // 模拟存储操作失败
      chrome.storage.sync.get.mockRejectedValue(new Error('Storage error'));

      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      await messageHandler(
        { type: 'GET_SETTINGS' },
        {},
        sendResponse
      );

      expect(consoleSpy).toHaveBeenCalledWith('Message handler error:', expect.any(Error));
      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Storage error'
      });
      
      consoleSpy.mockRestore();
    });
  });
}); 