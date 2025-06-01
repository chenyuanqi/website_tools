/**
 * 复制自由功能单元测试
 * 测试SelectionUnlockModule类的各个方法
 */

import { SelectionUnlockModule } from '../../src/content/selection-unlock';
import { createMockElement } from '../setup';

describe('SelectionUnlockModule', () => {
  let unlockModule: SelectionUnlockModule;
  let originalLocation: Location;

  beforeAll(() => {
    // 保存原始location
    originalLocation = window.location;
  });

  afterAll(() => {
    // 恢复原始location
    try {
      delete (window as any).location;
      window.location = originalLocation;
    } catch (e) {
      // 如果无法删除，则跳过
    }
  });

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 安全地模拟window.location
    try {
      delete (window as any).location;
      (window as any).location = {
        reload: jest.fn(),
        href: 'https://localhost/test',
        hostname: 'localhost',
        protocol: 'https:',
        origin: 'https://localhost'
      };
    } catch (e) {
      // 如果无法删除，则使用Object.assign
      Object.assign(window.location, {
        reload: jest.fn(),
        href: 'https://localhost/test',
        hostname: 'localhost',
        protocol: 'https:',
        origin: 'https://localhost'
      });
    }
    
    // 模拟chrome.storage
    chrome.storage.local.get.mockResolvedValue({});
    chrome.storage.local.set.mockResolvedValue(undefined);
    chrome.runtime.onMessage.addListener.mockImplementation(() => {});
    chrome.runtime.onMessage.removeListener.mockImplementation(() => {});

    // 模拟EventTarget
    global.EventTarget = {
      prototype: {
        addEventListener: jest.fn()
      }
    } as any;

    // 模拟requestIdleCallback
    global.requestIdleCallback = jest.fn().mockImplementation((callback) => {
      setTimeout(callback, 0);
      return 1;
    });
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
        copyFreedomWhitelist: ['localhost'] 
      });

      const enableSpy = jest.spyOn(SelectionUnlockModule.prototype, 'enable');
      unlockModule = new SelectionUnlockModule();

      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['copyFreedomWhitelist']);
      expect(enableSpy).toHaveBeenCalled();
    });
  });

  describe('启用和禁用功能', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('enable() 应该启用文本选择解锁', () => {
      unlockModule.enable();
      expect(unlockModule.getStatus().enabled).toBe(true);
    });

    test('disable() 应该禁用文本选择解锁', () => {
      unlockModule.enable();
      unlockModule.disable();

      expect(unlockModule.getStatus().enabled).toBe(false);
    });
  });

  describe('CSS样式注入', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('injectPowerfulStyles() 应该注入强力样式', () => {
      const mockElement = createMockElement('style');
      const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockElement);
      const appendChildSpy = jest.spyOn(document.head, 'appendChild');

      (unlockModule as any).injectPowerfulStyles();

      expect(createElementSpy).toHaveBeenCalledWith('style');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(mockElement.id).toBe('yuanqi-supercopy-unlock');
      expect(mockElement.textContent).toContain('user-select: text !important');
    });

    test('应该移除旧样式再注入新样式', () => {
      const mockElement = createMockElement('style');
      jest.spyOn(document, 'createElement').mockReturnValue(mockElement);
      
      // 第一次注入
      (unlockModule as any).injectPowerfulStyles();
      const firstElement = (unlockModule as any).injectedStyle;
      
      // 第二次注入应该移除旧的
      (unlockModule as any).injectPowerfulStyles();
      
      expect(firstElement.remove).toHaveBeenCalled();
    });
  });

  describe('事件处理器清理', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('removeExplicitHandlers() 应该清理内联事件处理器', () => {
      const mockElements = [
        createMockElement('div'),
        createMockElement('span')
      ];
      
      jest.spyOn(document, 'querySelectorAll').mockReturnValue(mockElements);

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
      const cloneNodeSpy = jest.spyOn(document.documentElement, 'cloneNode');
      const replaceWithSpy = jest.spyOn(document.documentElement, 'replaceWith');
      const scrollToSpy = jest.spyOn(window, 'scrollTo');

      (unlockModule as any).cloneAndReplaceDocument();

      expect(cloneNodeSpy).toHaveBeenCalledWith(true);
      expect(replaceWithSpy).toHaveBeenCalled();
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });

    test('clone&replace失败时应该使用备用方案', () => {
      jest.spyOn(document.documentElement, 'cloneNode').mockImplementation(() => {
        throw new Error('Clone failed');
      });
      
      const bodyCloneSpy = jest.spyOn(document.body, 'cloneNode');
      const bodyReplaceSpy = jest.spyOn(document.body, 'replaceWith');

      (unlockModule as any).cloneAndReplaceDocument();

      expect(bodyCloneSpy).toHaveBeenCalledWith(true);
      expect(bodyReplaceSpy).toHaveBeenCalled();
    });
  });

  describe('强力模式', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('enableViolentMode() 应该启用强力模式', () => {
      unlockModule.enableViolentMode();

      expect(document.body.contentEditable).toBe('true');
      expect(document.designMode).toBe('on');
      expect(unlockModule.getStatus().violentMode).toBe(true);
    });

    test('disableViolentMode() 应该禁用强力模式', () => {
      unlockModule.enableViolentMode();
      (unlockModule as any).disableViolentMode();

      expect(document.body.contentEditable).toBe('false');
      expect(document.designMode).toBe('off');
      expect(unlockModule.getStatus().violentMode).toBe(false);
    });
  });

  describe('右键菜单恢复', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('restoreRightClick() 应该恢复右键菜单', () => {
      unlockModule.restoreRightClick();

      expect(document.oncontextmenu).toBeNull();
      expect(document.body.oncontextmenu).toBeNull();
    });
  });

  describe('键盘快捷键恢复', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('restoreKeyboardShortcuts() 应该恢复键盘快捷键', () => {
      unlockModule.restoreKeyboardShortcuts();

      // 验证键盘事件处理器被添加
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
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
        host: 'localhost',
        url: 'http://localhost/'
      });
    });

    test('状态应该随操作更新', () => {
      unlockModule.enable();
      expect(unlockModule.getStatus().enabled).toBe(true);
      
      unlockModule.disable();
      expect(unlockModule.getStatus().enabled).toBe(false);
    });
  });

  describe('白名单管理', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('addToWhitelist() 应该添加域名到白名单', async () => {
      await (unlockModule as any).addToWhitelist();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        copyFreedomWhitelist: ['localhost']
      });
    });

    test('removeFromWhitelist() 应该从白名单移除域名', async () => {
      // 先设置白名单包含当前域名和其他域名
      chrome.storage.local.get.mockResolvedValue({
        copyFreedomWhitelist: ['localhost', 'test.com']
      });

      await (unlockModule as any).removeFromWhitelist();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        copyFreedomWhitelist: ['test.com']
      });
    });
  });

  describe('错误处理', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('强力模式启用失败时应该优雅处理', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // 模拟设置contentEditable失败
      const originalDescriptor = Object.getOwnPropertyDescriptor(document.body, 'contentEditable');
      Object.defineProperty(document.body, 'contentEditable', {
        set: () => { throw new Error('Permission denied'); },
        configurable: true
      });

      expect(() => {
        unlockModule.enableViolentMode();
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      
      // 恢复原始属性
      if (originalDescriptor) {
        Object.defineProperty(document.body, 'contentEditable', originalDescriptor);
      }
      
      consoleSpy.mockRestore();
    });

    test('样式注入失败时应该优雅处理', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // 临时保存原始方法
      const originalCreateElement = document.createElement;
      
      // 模拟createElement失败
      document.createElement = jest.fn().mockImplementation(() => {
        throw new Error('DOM error');
      });

      // 测试应该捕获错误而不是抛出
      let errorCaught = false;
      try {
        (unlockModule as any).injectPowerfulStyles();
      } catch (error) {
        errorCaught = true;
      }

      expect(errorCaught).toBe(false); // 应该没有抛出错误
      expect(consoleSpy).toHaveBeenCalled();
      
      // 恢复原始方法
      document.createElement = originalCreateElement;
      consoleSpy.mockRestore();
    });

    test('白名单操作失败时应该优雅处理', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      await expect((unlockModule as any).addToWhitelist()).resolves.not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('性能优化', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('应该避免重复操作', () => {
      const injectStylesSpy = jest.spyOn(unlockModule as any, 'injectPowerfulStyles');
      
      unlockModule.enable();
      unlockModule.enable(); // 第二次调用
      
      // 第二次调用应该被忽略
      expect(injectStylesSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('兼容性处理', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('应该处理特殊网站', () => {
      const handleSpecialSitesSpy = jest.spyOn(unlockModule as any, 'handleSpecialSites');
      
      unlockModule.enable();
      
      expect(handleSpecialSitesSpy).toHaveBeenCalled();
    });

    test('应该处理iframe环境', () => {
      // 模拟iframe环境
      Object.defineProperty(window, 'parent', {
        value: {},
        writable: true
      });
      
      expect(() => {
        unlockModule.enable();
      }).not.toThrow();
    });
  });

  describe('消息处理', () => {
    beforeEach(() => {
      unlockModule = new SelectionUnlockModule();
    });

    test('应该处理启用消息', () => {
      const enableSpy = jest.spyOn(unlockModule, 'enable');
      const addToWhitelistSpy = jest.spyOn(unlockModule as any, 'addToWhitelist').mockImplementation();
      
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();
      
      messageHandler({
        type: 'ENABLE_TEXT_SELECTION'
      }, {}, sendResponse);
      
      expect(enableSpy).toHaveBeenCalled();
      expect(addToWhitelistSpy).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('应该处理禁用消息', () => {
      const disableSpy = jest.spyOn(unlockModule, 'disable');
      const removeFromWhitelistSpy = jest.spyOn(unlockModule as any, 'removeFromWhitelist').mockImplementation();
      
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();
      
      messageHandler({
        type: 'DISABLE_TEXT_SELECTION'
      }, {}, sendResponse);
      
      expect(disableSpy).toHaveBeenCalled();
      expect(removeFromWhitelistSpy).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('应该处理切换消息', () => {
      const toggleSpy = jest.spyOn(unlockModule, 'toggle');
      
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();
      
      messageHandler({
        type: 'TOGGLE_TEXT_SELECTION'
      }, {}, sendResponse);
      
      expect(toggleSpy).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ 
        success: true, 
        enabled: unlockModule.getStatus().enabled 
      });
    });

    test('应该处理强力模式消息', () => {
      const enableViolentModeSpy = jest.spyOn(unlockModule, 'enableViolentMode');
      
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();
      
      messageHandler({
        type: 'ENABLE_VIOLENT_MODE'
      }, {}, sendResponse);
      
      expect(enableViolentModeSpy).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('清理和销毁', () => {
    test('destroy() 应该正确清理资源', () => {
      unlockModule = new SelectionUnlockModule();
      
      const restoreEventListenerSpy = jest.spyOn(unlockModule as any, 'restoreEventListener');
      
      (unlockModule as any).destroy();
      
      expect(restoreEventListenerSpy).toHaveBeenCalled();
      expect(chrome.runtime.onMessage.removeListener).toHaveBeenCalled();
    });
  });
}); 