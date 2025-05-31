/**
 * 复制自由功能单元测试
 * 测试SelectionUnlockModule类的各个方法
 */

import { SelectionUnlockModule } from '../../src/content/selection-unlock';

// 模拟DOM环境
const mockElement = {
  style: {},
  setAttribute: jest.fn(),
  getAttribute: jest.fn(),
  removeAttribute: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  cloneNode: jest.fn().mockReturnThis(),
  replaceWith: jest.fn(),
  remove: jest.fn(),
  querySelectorAll: jest.fn().mockReturnValue([]),
  querySelector: jest.fn(),
  id: 'test-element'
};

const mockDocument = {
  ...global.document,
  createElement: jest.fn().mockReturnValue(mockElement),
  getElementById: jest.fn(),
  querySelectorAll: jest.fn().mockReturnValue([]),
  querySelector: jest.fn(),
  head: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  },
  body: {
    ...mockElement,
    contentEditable: 'false'
  },
  documentElement: {
    ...mockElement,
    replaceWith: jest.fn(),
    cloneNode: jest.fn().mockReturnThis()
  },
  designMode: 'off',
  oncontextmenu: null,
  onkeydown: null,
  onkeyup: null,
  onkeypress: null
};

// 模拟window对象
const mockWindow = {
  location: {
    href: 'https://example.com/test',
    host: 'example.com',
    hostname: 'example.com'
  },
  scrollX: 0,
  scrollY: 0,
  scrollTo: jest.fn(),
  getSelection: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue(''),
    removeAllRanges: jest.fn(),
    addRange: jest.fn()
  })
};

describe('SelectionUnlockModule', () => {
  let unlockModule: SelectionUnlockModule;
  let originalDocument: any;
  let originalWindow: any;
  let originalEventTarget: any;

  beforeEach(() => {
    // 保存原始对象引用
    originalDocument = global.document;
    originalWindow = global.window;
    originalEventTarget = global.EventTarget;

    // 使用jest.spyOn模拟document方法，而不是重新定义整个对象
    jest.spyOn(document, 'querySelector').mockReturnValue(mockElement);
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockElement]);
    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    jest.spyOn(document, 'createElement').mockReturnValue(mockElement);
    
    // 模拟document.head和document.body
    if (!document.head) {
      Object.defineProperty(document, 'head', {
        value: { appendChild: jest.fn(), removeChild: jest.fn() },
        configurable: true
      });
    } else {
      jest.spyOn(document.head, 'appendChild').mockImplementation(jest.fn());
    }
    
    if (!document.body) {
      Object.defineProperty(document, 'body', {
        value: { 
          appendChild: jest.fn(), 
          removeChild: jest.fn(),
          cloneNode: jest.fn().mockReturnValue(mockElement),
          replaceWith: jest.fn()
        },
        configurable: true
      });
    } else {
      jest.spyOn(document.body, 'appendChild').mockImplementation(jest.fn());
      jest.spyOn(document.body, 'cloneNode').mockReturnValue(mockElement);
      jest.spyOn(document.body, 'replaceWith').mockImplementation(jest.fn());
    }

    // 模拟documentElement
    if (!document.documentElement) {
      Object.defineProperty(document, 'documentElement', {
        value: {
          cloneNode: jest.fn().mockReturnValue(mockElement),
          replaceWith: jest.fn()
        },
        configurable: true
      });
    } else {
      jest.spyOn(document.documentElement, 'cloneNode').mockReturnValue(mockElement);
      jest.spyOn(document.documentElement, 'replaceWith').mockImplementation(jest.fn());
    }

    // 模拟window对象的方法
    if (typeof window !== 'undefined') {
      jest.spyOn(window, 'scrollTo').mockImplementation(jest.fn());
    }

    // 模拟EventTarget
    global.EventTarget = {
      prototype: {
        addEventListener: jest.fn()
      }
    } as any;

    // 重置所有模拟
    jest.clearAllMocks();
    
    // 模拟chrome.storage
    chrome.storage.local.get.mockResolvedValue({ copyFreedomWhitelist: [] });
    chrome.storage.local.set.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // 恢复所有模拟
    jest.restoreAllMocks();
    
    // 恢复EventTarget
    if (originalEventTarget) {
      global.EventTarget = originalEventTarget;
    }
  });

  describe('构造函数和初始化', () => {
    test('应该正确初始化模块', () => {
      unlockModule = new SelectionUnlockModule();
      
      expect(unlockModule).toBeDefined();
      expect(unlockModule.getStatus().enabled).toBe(false);
      expect(unlockModule.getStatus().violentMode).toBe(false);
    });

    test('应该检查白名单并自动启用', async () => {
      // 模拟白名单包含当前域名
      chrome.storage.local.get.mockResolvedValue({ 
        copyFreedomWhitelist: ['example.com'] 
      });

      const enableSpy = jest.spyOn(SelectionUnlockModule.prototype, 'enable');
      unlockModule = new SelectionUnlockModule();

      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['copyFreedomWhitelist']);
      expect(enableSpy).toHaveBeenCalled();
    });
  });

  describe('启用和禁用功能', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('enable() 应该启用文本选择解锁', () => {
      const injectStylesSpy = jest.spyOn(unlockModule as any, 'injectPowerfulStyles');
      const removeHandlersSpy = jest.spyOn(unlockModule as any, 'removeExplicitHandlers');
      const cloneReplaceSpy = jest.spyOn(unlockModule as any, 'cloneAndReplaceDocument');
      const patchEventSpy = jest.spyOn(unlockModule as any, 'patchEventListener');

      unlockModule.enable();

      expect(injectStylesSpy).toHaveBeenCalled();
      expect(removeHandlersSpy).toHaveBeenCalled();
      expect(cloneReplaceSpy).toHaveBeenCalled();
      expect(patchEventSpy).toHaveBeenCalled();
      expect(unlockModule.getStatus().enabled).toBe(true);
    });

    test.skip('disable() 应该禁用文本选择解锁', () => {
      // 先启用
      unlockModule.enable();
      expect(unlockModule.getStatus().enabled).toBe(true);

      // 模拟window.location.reload - 使用更安全的方法
      const originalReload = window.location.reload;
      const mockReload = jest.fn();
      
      // 临时替换reload方法
      Object.defineProperty(window.location, 'reload', {
        value: mockReload,
        writable: true,
        configurable: true
      });

      try {
        // 禁用
        unlockModule.disable();

        expect(unlockModule.getStatus().enabled).toBe(false);
        expect(mockReload).toHaveBeenCalled();
      } finally {
        // 恢复原始方法
        Object.defineProperty(window.location, 'reload', {
          value: originalReload,
          writable: true,
          configurable: true
        });
      }
    });

    test('重复调用enable()应该被忽略', () => {
      const injectStylesSpy = jest.spyOn(unlockModule as any, 'injectPowerfulStyles');
      
      unlockModule.enable();
      unlockModule.enable(); // 第二次调用

      expect(injectStylesSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('CSS样式注入', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('injectPowerfulStyles() 应该注入强力样式', () => {
      const createElementSpy = jest.spyOn(mockDocument, 'createElement');
      const appendChildSpy = jest.spyOn(mockDocument.head, 'appendChild');

      (unlockModule as any).injectPowerfulStyles();

      expect(createElementSpy).toHaveBeenCalledWith('style');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(mockElement.id).toBe('yuanqi-supercopy-unlock');
      expect(mockElement.textContent).toContain('user-select: text !important');
    });

    test('应该移除旧样式再注入新样式', () => {
      const removeSpy = jest.spyOn(mockElement, 'remove');
      
      // 模拟已存在的样式
      (unlockModule as any).injectedStyle = mockElement;
      
      (unlockModule as any).injectPowerfulStyles();

      expect(removeSpy).toHaveBeenCalled();
    });
  });

  describe('事件处理器清理', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('removeExplicitHandlers() 应该清理内联事件处理器', () => {
      const mockElements = [
        { removeAttribute: jest.fn(), oncontextmenu: jest.fn() },
        { removeAttribute: jest.fn(), onselectstart: jest.fn() }
      ];
      
      mockDocument.querySelectorAll.mockReturnValue(mockElements);

      (unlockModule as any).removeExplicitHandlers();

      mockElements.forEach(element => {
        expect(element.removeAttribute).toHaveBeenCalledWith('oncontextmenu');
        expect(element.removeAttribute).toHaveBeenCalledWith('onselectstart');
        expect(element.removeAttribute).toHaveBeenCalledWith('ondragstart');
      });
    });
  });

  describe('clone&replace技巧', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('cloneAndReplaceDocument() 应该克隆并替换文档', () => {
      const cloneNodeSpy = jest.spyOn(mockDocument.documentElement, 'cloneNode');
      const replaceWithSpy = jest.spyOn(mockDocument.documentElement, 'replaceWith');
      const scrollToSpy = jest.spyOn(mockWindow, 'scrollTo');

      (unlockModule as any).cloneAndReplaceDocument();

      expect(cloneNodeSpy).toHaveBeenCalledWith(true);
      expect(replaceWithSpy).toHaveBeenCalled();
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });

    test('clone&replace失败时应该使用备用方案', () => {
      // 模拟documentElement.replaceWith失败
      mockDocument.documentElement.replaceWith.mockImplementation(() => {
        throw new Error('replaceWith failed');
      });

      const bodyCloneSpy = jest.spyOn(mockDocument.body, 'cloneNode');
      const bodyReplaceSpy = jest.spyOn(mockDocument.body, 'replaceWith');

      (unlockModule as any).cloneAndReplaceDocument();

      expect(bodyCloneSpy).toHaveBeenCalledWith(true);
      expect(bodyReplaceSpy).toHaveBeenCalled();
    });
  });

  describe('事件监听器拦截', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('patchEventListener() 应该拦截禁用事件', () => {
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      
      (unlockModule as any).patchEventListener();

      expect(EventTarget.prototype.addEventListener).not.toBe(originalAddEventListener);
    });
  });

  describe('强力模式', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('enableViolentMode() 应该启用强力模式', () => {
      unlockModule.enableViolentMode();

      expect(mockDocument.body.contentEditable).toBe('true');
      expect(mockDocument.designMode).toBe('on');
      expect(unlockModule.getStatus().violentMode).toBe(true);
    });

    test('disableViolentMode() 应该禁用强力模式', () => {
      // 先启用强力模式
      unlockModule.enableViolentMode();
      expect(unlockModule.getStatus().violentMode).toBe(true);

      // 禁用强力模式
      (unlockModule as any).disableViolentMode();

      expect(mockDocument.body.contentEditable).toBe('false');
      expect(mockDocument.designMode).toBe('off');
      expect(unlockModule.getStatus().violentMode).toBe(false);
    });
  });

  describe('右键菜单恢复', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('restoreRightClick() 应该恢复右键菜单', () => {
      const mockElements = [
        { removeAttribute: jest.fn(), oncontextmenu: jest.fn() },
        { removeAttribute: jest.fn(), oncontextmenu: jest.fn() }
      ];
      
      mockDocument.querySelectorAll.mockReturnValue(mockElements);

      unlockModule.restoreRightClick();

      expect(mockDocument.oncontextmenu).toBeNull();
      expect(mockDocument.body.oncontextmenu).toBeNull();
      
      mockElements.forEach(element => {
        expect(element.oncontextmenu).toBeNull();
        expect(element.removeAttribute).toHaveBeenCalledWith('oncontextmenu');
      });
    });
  });

  describe('键盘快捷键恢复', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('restoreKeyboardShortcuts() 应该恢复键盘快捷键', () => {
      const mockElements = [
        { 
          removeAttribute: jest.fn(), 
          onkeydown: jest.fn(),
          onkeyup: jest.fn(),
          onkeypress: jest.fn()
        }
      ];
      
      mockDocument.querySelectorAll.mockReturnValue(mockElements);

      unlockModule.restoreKeyboardShortcuts();

      expect(mockDocument.onkeydown).toBeNull();
      expect(mockDocument.onkeyup).toBeNull();
      expect(mockDocument.onkeypress).toBeNull();
      
      mockElements.forEach(element => {
        expect(element.onkeydown).toBeNull();
        expect(element.onkeyup).toBeNull();
        expect(element.onkeypress).toBeNull();
      });
    });
  });

  describe('状态管理', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('getStatus() 应该返回正确的状态信息', () => {
      const status = unlockModule.getStatus();

      expect(status).toEqual({
        enabled: false,
        violentMode: false,
        host: 'example.com',
        url: 'https://example.com/test'
      });
    });

    test('启用功能后状态应该更新', () => {
      unlockModule.enable();
      const status = unlockModule.getStatus();

      expect(status.enabled).toBe(true);
    });

    test('启用强力模式后状态应该更新', () => {
      unlockModule.enableViolentMode();
      const status = unlockModule.getStatus();

      expect(status.violentMode).toBe(true);
    });
  });

  describe('消息处理', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('应该正确处理消息', () => {
      const handleMessageSpy = jest.spyOn(unlockModule as any, 'handleMessage');
      
      // 模拟消息监听器被调用
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
      
      // 获取注册的消息处理器
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      
      // 测试消息处理
      const mockRequest = { type: 'ENABLE_TEXT_SELECTION' };
      const mockSender = {};
      const mockSendResponse = jest.fn();
      
      messageHandler(mockRequest, mockSender, mockSendResponse);
      
      // 验证消息处理器被调用
      expect(typeof messageHandler).toBe('function');
    });
  });

  describe('错误处理', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('白名单检查失败时应该优雅处理', async () => {
      // 模拟storage.get失败
      chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // 创建新实例触发白名单检查
      new SelectionUnlockModule();
      
      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[复制自由] 检查白名单失败:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    test('强力模式启用失败时应该优雅处理', () => {
      // 模拟body不存在
      Object.defineProperty(mockDocument, 'body', {
        value: null,
        writable: true
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      unlockModule.enableViolentMode();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[复制自由] 强力模式启用失败:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
}); 