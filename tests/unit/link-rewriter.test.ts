/**
 * 链接管理功能单元测试
 * 测试LinkRewriterModule类的各个方法
 */

import { LinkRewriterModule } from '../../src/content/link-rewriter';

// 模拟链接设置
const defaultSettings = {
  enabled: true,
  newTabForExternal: true,
  popupPreview: false,
  customRules: []
};

// 模拟DOM元素
const mockElement = {
  id: '',
  className: '',
  innerHTML: '',
  textContent: '',
  style: { cssText: '' },
  setAttribute: jest.fn(),
  getAttribute: jest.fn(),
  removeAttribute: jest.fn(),
  hasAttribute: jest.fn().mockReturnValue(false),
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  querySelector: jest.fn().mockReturnValue(null),
  querySelectorAll: jest.fn().mockReturnValue([]),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  cloneNode: jest.fn().mockReturnThis(),
  replaceWith: jest.fn(),
  remove: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn().mockReturnValue(false)
  }
};

const createMockLink = (href: string, attributes: Record<string, string> = {}) => {
  const link = {
    href,
    hostname: new URL(href).hostname,
    tagName: 'A',
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn().mockReturnValue(false)
    },
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    hasAttribute: jest.fn().mockReturnValue(false),
    appendChild: jest.fn(),
    querySelector: jest.fn().mockReturnValue(null),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    ...attributes
  };
  
  // 模拟hasAttribute行为
  link.hasAttribute.mockImplementation((attr: string) => {
    return attributes[attr] !== undefined;
  });
  
  // 模拟getAttribute行为
  link.getAttribute.mockImplementation((attr: string) => {
    return attributes[attr] || null;
  });
  
  return link as any as HTMLAnchorElement;
};

// 模拟document
const mockDocument = {
  ...global.document,
  querySelectorAll: jest.fn(),
  querySelector: jest.fn(),
  createElement: jest.fn(),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  },
  readyState: 'complete'
};

// 模拟window
const mockWindow = {
  location: {
    hostname: 'example.com',
    href: 'https://example.com'
  },
  innerWidth: 1920,
  innerHeight: 1080,
  open: jest.fn()
};

// 模拟MutationObserver
const mockMutationObserver = {
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn().mockReturnValue([])
};

describe('LinkRewriterModule', () => {
  let linkRewriter: LinkRewriterModule;
  let originalDocument: any;
  let originalWindow: any;
  let originalMutationObserver: any;

  beforeEach(() => {
    // 保存原始对象
    originalDocument = global.document;
    originalWindow = global.window;
    originalMutationObserver = global.MutationObserver;

    // 使用jest.spyOn模拟document方法，而不是重新定义整个对象
    jest.spyOn(document, 'querySelector').mockReturnValue(null);
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([]);
    jest.spyOn(document, 'getElementById').mockReturnValue(null);
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
        value: { appendChild: jest.fn(), removeChild: jest.fn() },
        configurable: true
      });
    } else {
      jest.spyOn(document.body, 'appendChild').mockImplementation(jest.fn());
    }

    // 模拟window对象的方法
    if (typeof window !== 'undefined') {
      jest.spyOn(window, 'addEventListener').mockImplementation(jest.fn());
      jest.spyOn(window, 'removeEventListener').mockImplementation(jest.fn());
    }

    // 模拟MutationObserver
    Object.defineProperty(global, 'MutationObserver', {
      value: jest.fn().mockImplementation(() => mockMutationObserver),
      writable: true,
      configurable: true
    });

    // 重置所有模拟
    jest.clearAllMocks();
    
    // 模拟chrome.storage
    chrome.storage.sync.get.mockResolvedValue({ 
      websiteToolsSettings: { linkManager: defaultSettings } 
    });
    chrome.runtime.onMessage.addListener.mockImplementation(() => {});
    chrome.runtime.onMessage.removeListener.mockImplementation(() => {});

    // 模拟requestIdleCallback
    global.requestIdleCallback = jest.fn().mockImplementation((callback) => {
      setTimeout(callback, 0);
      return 1;
    });
  });

  afterEach(() => {
    // 恢复所有模拟
    jest.restoreAllMocks();
    
    // 恢复MutationObserver
    if (originalMutationObserver) {
      global.MutationObserver = originalMutationObserver;
    }
  });

  describe('构造函数和初始化', () => {
    test('应该正确初始化模块', () => {
      linkRewriter = new LinkRewriterModule(defaultSettings);
      
      expect(linkRewriter).toBeDefined();
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
      expect(global.MutationObserver).toHaveBeenCalled();
    });

    test('应该处理现有链接', () => {
      const mockLinks = [
        createMockLink('https://external.com/page'),
        createMockLink('https://example.com/internal')
      ];
      
      mockDocument.querySelectorAll.mockReturnValue(mockLinks);
      
      linkRewriter = new LinkRewriterModule(defaultSettings);
      
      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith('a[href]');
      expect(mockLinks[0].classList.add).toHaveBeenCalledWith('yuanqi-external-link');
      expect(mockLinks[1].classList.add).toHaveBeenCalledWith('yuanqi-internal-link');
    });
  });

  describe('链接分类', () => {
    beforeEach(() => {
      linkRewriter = new LinkRewriterModule(defaultSettings);
    });

    test('应该正确识别外部链接', () => {
      const externalLink = createMockLink('https://external.com/page');
      const internalLink = createMockLink('https://example.com/page');
      
      mockDocument.querySelectorAll.mockReturnValue([externalLink, internalLink]);
      
      (linkRewriter as any).processAllLinks();
      
      expect(externalLink.classList.add).toHaveBeenCalledWith('yuanqi-external-link');
      expect(internalLink.classList.add).toHaveBeenCalledWith('yuanqi-internal-link');
    });

    test('应该处理无效URL', () => {
      const invalidLink = createMockLink('invalid-url');
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
      
      mockDocument.querySelectorAll.mockReturnValue([invalidLink]);
      
      (linkRewriter as any).processAllLinks();
      
      expect(consoleSpy).toHaveBeenCalledWith('[链接管理] 无效链接:', 'invalid-url');
      consoleSpy.mockRestore();
    });
  });

  describe('新标签页功能', () => {
    beforeEach(() => {
      linkRewriter = new LinkRewriterModule(defaultSettings);
    });

    test('应该为外部链接设置新标签页属性', () => {
      const externalLink = createMockLink('https://external.com/page');
      
      (linkRewriter as any).setupNewTabLink(externalLink, true);
      
      expect(externalLink.setAttribute).toHaveBeenCalledWith('target', '_blank');
      expect(externalLink.setAttribute).toHaveBeenCalledWith('rel', 'noopener noreferrer');
    });

    test('应该保存原有属性', () => {
      const linkWithTarget = createMockLink('https://external.com/page', {
        target: '_self',
        rel: 'bookmark'
      });
      
      linkWithTarget.hasAttribute.mockImplementation((attr) => 
        attr === 'target' || attr === 'rel'
      );
      linkWithTarget.getAttribute.mockImplementation((attr) => {
        if (attr === 'target') return '_self';
        if (attr === 'rel') return 'bookmark';
        return null;
      });
      
      (linkRewriter as any).setupNewTabLink(linkWithTarget, true);
      
      expect(linkWithTarget.setAttribute).toHaveBeenCalledWith('data-original-target', '_self');
      expect(linkWithTarget.setAttribute).toHaveBeenCalledWith('data-original-rel', 'bookmark');
    });

    test('应该添加外部链接图标', () => {
      const externalLink = createMockLink('https://external.com/page');
      const mockIcon = { 
        className: '',
        innerHTML: '',
        style: { cssText: '' }
      };
      
      mockDocument.createElement.mockReturnValue(mockIcon);
      
      (linkRewriter as any).addExternalLinkIcon(externalLink);
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('span');
      expect(mockIcon.className).toBe('yuanqi-external-icon');
      expect(mockIcon.innerHTML).toBe('↗');
      expect(externalLink.appendChild).toHaveBeenCalledWith(mockIcon);
    });

    test('不应该重复添加图标', () => {
      const externalLink = createMockLink('https://external.com/page');
      externalLink.querySelector.mockReturnValue({}); // 模拟已存在图标
      
      (linkRewriter as any).addExternalLinkIcon(externalLink);
      
      expect(mockDocument.createElement).not.toHaveBeenCalled();
    });
  });

  describe('预览功能', () => {
    beforeEach(() => {
      const previewSettings = { ...defaultSettings, popupPreview: true };
      linkRewriter = new LinkRewriterModule(previewSettings);
    });

    test('应该创建预览容器', () => {
      const mockContainer = {
        id: '',
        style: { cssText: '' },
        appendChild: jest.fn()
      };
      const mockContent = {
        className: '',
        style: { cssText: '' },
        appendChild: jest.fn()
      };
      const mockLoader = {
        className: '',
        innerHTML: '',
        style: { cssText: '' }
      };
      
      mockDocument.createElement
        .mockReturnValueOnce(mockContainer)
        .mockReturnValueOnce(mockContent)
        .mockReturnValueOnce(mockLoader);
      
      (linkRewriter as any).createPreviewContainer();
      
      expect(mockContainer.id).toBe('yuanqi-link-preview');
      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockContainer);
    });

    test('应该为链接设置预览事件', () => {
      const previewLink = createMockLink('https://example.com/page');
      
      (linkRewriter as any).setupPreviewLink(previewLink);
      
      expect(previewLink.addEventListener).toHaveBeenCalledWith('mouseenter', expect.any(Function));
      expect(previewLink.addEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
    });

    test('应该添加预览图标', () => {
      const previewLink = createMockLink('https://example.com/page');
      const mockIcon = { 
        className: '',
        innerHTML: '',
        style: { cssText: '' }
      };
      
      mockDocument.createElement.mockReturnValue(mockIcon);
      
      (linkRewriter as any).addPreviewIcon(previewLink);
      
      expect(mockIcon.className).toBe('yuanqi-preview-icon');
      expect(mockIcon.innerHTML).toBe('👁');
      expect(previewLink.appendChild).toHaveBeenCalledWith(mockIcon);
    });
  });

  describe('自定义规则', () => {
    test('应该应用自定义规则', () => {
      const customSettings = {
        ...defaultSettings,
        customRules: [
          { domain: 'github.com', action: 'newTab' as const },
          { domain: 'stackoverflow.com', action: 'preview' as const }
        ]
      };
      
      linkRewriter = new LinkRewriterModule(customSettings);
      
      const githubUrl = new URL('https://github.com/user/repo');
      const stackoverflowUrl = new URL('https://stackoverflow.com/questions/123');
      
      const githubAction = (linkRewriter as any).getLinkAction(githubUrl, true);
      const stackoverflowAction = (linkRewriter as any).getLinkAction(stackoverflowUrl, true);
      
      expect(githubAction).toBe('newTab');
      expect(stackoverflowAction).toBe('preview');
    });

    test('应该优先使用自定义规则而非默认规则', () => {
      const customSettings = {
        ...defaultSettings,
        newTabForExternal: false,
        customRules: [
          { domain: 'external.com', action: 'newTab' as const }
        ]
      };
      
      linkRewriter = new LinkRewriterModule(customSettings);
      
      const externalUrl = new URL('https://external.com/page');
      const action = (linkRewriter as any).getLinkAction(externalUrl, true);
      
      expect(action).toBe('newTab');
    });
  });

  describe('消息处理', () => {
    beforeEach(() => {
      linkRewriter = new LinkRewriterModule(defaultSettings);
    });

    test('应该处理ENABLE_NEW_TAB_MODE消息', () => {
      const reprocessSpy = jest.spyOn(linkRewriter as any, 'reprocessAllLinks');
      const sendResponse = jest.fn();
      
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageHandler(
        { type: 'ENABLE_NEW_TAB_MODE', data: { enabled: false } },
        {},
        sendResponse
      );
      
      expect(reprocessSpy).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('应该处理ENABLE_PREVIEW_MODE消息', () => {
      const createPreviewSpy = jest.spyOn(linkRewriter as any, 'createPreviewContainer');
      const sendResponse = jest.fn();
      
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageHandler(
        { type: 'ENABLE_PREVIEW_MODE', data: { enabled: true } },
        {},
        sendResponse
      );
      
      expect(createPreviewSpy).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('应该处理GET_LINK_STATS消息', () => {
      const mockLinks = [
        createMockLink('https://external.com/page'),
        createMockLink('https://example.com/internal')
      ];
      
      mockDocument.querySelectorAll
        .mockReturnValueOnce(mockLinks) // 所有链接
        .mockReturnValueOnce([mockLinks[0]]) // 外部链接
        .mockReturnValueOnce([mockLinks[1]]); // 内部链接
      
      const sendResponse = jest.fn();
      
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageHandler(
        { type: 'GET_LINK_STATS' },
        {},
        sendResponse
      );
      
      expect(sendResponse).toHaveBeenCalledWith({
        total: 2,
        external: 1,
        internal: 1,
        processed: expect.any(Number)
      });
    });
  });

  describe('DOM变化监听', () => {
    beforeEach(() => {
      linkRewriter = new LinkRewriterModule(defaultSettings);
    });

    test('应该启动MutationObserver', () => {
      expect(global.MutationObserver).toHaveBeenCalled();
      expect(mockMutationObserver.observe).toHaveBeenCalledWith(
        mockDocument.body,
        { childList: true, subtree: true }
      );
    });

    test('应该处理新添加的链接', () => {
      const processLinkSpy = jest.spyOn(linkRewriter as any, 'processLink');
      
      // 获取MutationObserver的回调
      const observerCallback = (global.MutationObserver as jest.Mock).mock.calls[0][0];
      
      // 模拟DOM变化
      const mockMutation = {
        type: 'childList',
        addedNodes: [
          {
            nodeType: 1, // Node.ELEMENT_NODE
            tagName: 'A',
            href: 'https://new-link.com',
            querySelectorAll: jest.fn().mockReturnValue([])
          }
        ]
      };
      
      observerCallback([mockMutation]);
      
      // 等待requestIdleCallback执行
      setTimeout(() => {
        expect(processLinkSpy).toHaveBeenCalled();
      }, 0);
    });
  });

  describe('链接清理', () => {
    beforeEach(() => {
      linkRewriter = new LinkRewriterModule(defaultSettings);
    });

    test('应该恢复链接的原始属性', () => {
      const link = createMockLink('https://external.com/page', {
        'data-original-target': '_self',
        'data-original-rel': 'bookmark'
      });
      
      link.hasAttribute.mockImplementation((attr) => 
        attr === 'data-original-target' || attr === 'data-original-rel'
      );
      link.getAttribute.mockImplementation((attr) => {
        if (attr === 'data-original-target') return '_self';
        if (attr === 'data-original-rel') return 'bookmark';
        return null;
      });
      
      (linkRewriter as any).cleanupLink(link);
      
      expect(link.setAttribute).toHaveBeenCalledWith('target', '_self');
      expect(link.setAttribute).toHaveBeenCalledWith('rel', 'bookmark');
      expect(link.removeAttribute).toHaveBeenCalledWith('data-original-target');
      expect(link.removeAttribute).toHaveBeenCalledWith('data-original-rel');
    });

    test('应该移除添加的类名和图标', () => {
      const link = createMockLink('https://external.com/page');
      const mockIcon = { remove: jest.fn() };
      
      link.querySelector.mockReturnValue(mockIcon);
      
      (linkRewriter as any).cleanupLink(link);
      
      expect(link.classList.remove).toHaveBeenCalledWith('yuanqi-external-link', 'yuanqi-internal-link');
      expect(mockIcon.remove).toHaveBeenCalled();
    });
  });

  describe('设置更新', () => {
    beforeEach(() => {
      linkRewriter = new LinkRewriterModule(defaultSettings);
    });

    test('应该更新设置并重新处理链接', () => {
      const reprocessSpy = jest.spyOn(linkRewriter as any, 'reprocessAllLinks');
      
      linkRewriter.updateSettings({ newTabForExternal: false });
      
      expect(reprocessSpy).toHaveBeenCalled();
    });

    test('应该根据预览设置创建或移除预览容器', () => {
      const createPreviewSpy = jest.spyOn(linkRewriter as any, 'createPreviewContainer');
      const removePreviewSpy = jest.spyOn(linkRewriter as any, 'removePreviewContainer');
      
      // 启用预览
      linkRewriter.updateSettings({ popupPreview: true });
      expect(createPreviewSpy).toHaveBeenCalled();
      
      // 禁用预览
      linkRewriter.updateSettings({ popupPreview: false });
      expect(removePreviewSpy).toHaveBeenCalled();
    });
  });

  describe('销毁功能', () => {
    beforeEach(() => {
      linkRewriter = new LinkRewriterModule(defaultSettings);
    });

    test('应该清理所有资源', () => {
      const removePreviewSpy = jest.spyOn(linkRewriter as any, 'removePreviewContainer');
      
      linkRewriter.destroy();
      
      expect(mockMutationObserver.disconnect).toHaveBeenCalled();
      expect(removePreviewSpy).toHaveBeenCalled();
      expect(chrome.runtime.onMessage.removeListener).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    beforeEach(() => {
      linkRewriter = new LinkRewriterModule(defaultSettings);
    });

    test('应该处理预览加载失败', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // 模拟fetch失败
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const mockEvent = { clientX: 100, clientY: 100 };
      
      // 创建预览容器
      (linkRewriter as any).previewContainer = {
        style: {},
        querySelector: jest.fn().mockReturnValue({ innerHTML: '' })
      };
      
      await (linkRewriter as any).showPreview('https://example.com', mockEvent);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[链接管理] 预览加载失败:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
}); 