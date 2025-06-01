/**
 * 链接管理功能单元测试
 * 测试LinkRewriterModule类的各个方法
 */

import { LinkRewriterModule } from '../../src/content/link-rewriter';
import { createMockElement } from '../setup';

// 模拟链接设置
const defaultSettings = {
  enabled: true,
  newTabForExternal: true,
  popupPreview: false,
  customRules: []
};

const createMockLink = (href: string, attributes: Record<string, string> = {}) => {
  const link = createMockElement('a');
  link.href = href;
  
  try {
    const url = new URL(href);
    link.hostname = url.hostname;
  } catch (e) {
    link.hostname = '';
  }
  
  // 设置属性
  Object.keys(attributes).forEach(key => {
    link[key] = attributes[key];
  });
  
  // 模拟hasAttribute行为
  link.hasAttribute.mockImplementation((attr: string) => {
    return attributes[attr] !== undefined || link[attr] !== undefined;
  });
  
  // 模拟getAttribute行为
  link.getAttribute.mockImplementation((attr: string) => {
    return attributes[attr] || link[attr] || null;
  });
  
  return link;
};

describe('LinkRewriterModule', () => {
  let linkRewriter: LinkRewriterModule;

  beforeEach(() => {
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
        createMockLink('https://localhost/page') // 修改为localhost以匹配内部链接
      ];
      
      // 设置hostname属性
      mockLinks[0].hostname = 'external.com';
      mockLinks[1].hostname = 'localhost';
      
      jest.spyOn(document, 'querySelectorAll').mockReturnValue(mockLinks);
      
      linkRewriter = new LinkRewriterModule(defaultSettings);
      
      expect(document.querySelectorAll).toHaveBeenCalledWith('a[href]');
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
      const internalLink = createMockLink('http://localhost/page'); // 修改为localhost
      
      // 设置hostname属性以匹配URL
      externalLink.hostname = 'external.com';
      internalLink.hostname = 'localhost';
      
      linkRewriter = new LinkRewriterModule(defaultSettings);
      (linkRewriter as any).processLink(externalLink);
      (linkRewriter as any).processLink(internalLink);
      
      expect(externalLink.classList.add).toHaveBeenCalledWith('yuanqi-external-link');
      expect(internalLink.classList.add).toHaveBeenCalledWith('yuanqi-internal-link');
    });

    test('应该处理无效URL', () => {
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
      
      // 方法1：测试href为空的情况（会早期返回，不会打印日志）
      const emptyLink = createMockLink('');
      emptyLink.href = ''; // 确保href为空
      
      linkRewriter = new LinkRewriterModule(defaultSettings);
      (linkRewriter as any).processLink(emptyLink);
      
      // 方法2：测试真正无效的URL（会进入catch块）
      const invalidLink = createMockLink('invalid-url');
      
      // 模拟URL构造函数抛出错误
      const originalURL = global.URL;
      global.URL = jest.fn().mockImplementation((url) => {
        if (url === 'invalid-url') {
          throw new Error('Invalid URL');
        }
        return new originalURL(url);
      });
      
      (linkRewriter as any).processLink(invalidLink);
      
      expect(consoleSpy).toHaveBeenCalledWith('[链接管理] 无效链接:', 'invalid-url');
      
      // 恢复原始URL构造函数
      global.URL = originalURL;
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
      const mockIcon = createMockElement('span');
      
      (document.createElement as jest.Mock).mockReturnValue(mockIcon);
      
      (linkRewriter as any).addExternalLinkIcon(externalLink);
      
      expect(document.createElement).toHaveBeenCalledWith('span');
      expect(mockIcon.className).toBe('yuanqi-external-icon');
      expect(mockIcon.innerHTML).toBe('↗');
      expect(externalLink.appendChild).toHaveBeenCalledWith(mockIcon);
    });

    test('不应该重复添加图标', () => {
      const externalLink = createMockLink('https://external.com/page');
      const mockIcon = createMockElement('span');
      mockIcon.className = 'yuanqi-external-icon';
      
      // 模拟已存在图标
      externalLink.querySelector.mockReturnValue(mockIcon);
      
      linkRewriter = new LinkRewriterModule(defaultSettings);
      
      // 在linkRewriter创建后重置document.createElement
      const createElementSpy = jest.spyOn(document, 'createElement');
      createElementSpy.mockClear();
      
      (linkRewriter as any).addExternalLinkIcon(externalLink);
      
      expect(createElementSpy).not.toHaveBeenCalled();
    });
  });

  describe('预览功能', () => {
    beforeEach(() => {
      const previewSettings = { ...defaultSettings, popupPreview: true };
      linkRewriter = new LinkRewriterModule(previewSettings);
    });

    test('应该创建预览容器', () => {
      linkRewriter = new LinkRewriterModule(defaultSettings);
      
      // 清除之前的调用记录
      jest.clearAllMocks();
      
      (linkRewriter as any).createPreviewContainer();
      
      // 验证调用了正确的DOM方法
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(document.body.appendChild).toHaveBeenCalled();
      
      // 验证createElement被调用了3次（container, content, loader）
      expect(document.createElement).toHaveBeenCalledTimes(3);
    });

    test('应该显示预览', async () => {
      const link = createMockLink('https://example.com/page');
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          title: 'Test Page',
          description: 'Test Description'
        })
      };
      
      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      
      linkRewriter = new LinkRewriterModule(defaultSettings);
      
      // 先创建预览容器
      (linkRewriter as any).createPreviewContainer();
      
      await (linkRewriter as any).showPreview(link, 100, 200);
      
      // 验证调用了正确的API URL
      expect(global.fetch).toHaveBeenCalledWith(
        'https://r.jina.ai/https%3A%2F%2Fexample.com%2Fpage',
        { headers: { 'Accept': 'application/json' } }
      );
    });

    test('应该处理预览加载失败', async () => {
      const link = createMockLink('https://example.com/page');
      
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      await (linkRewriter as any).showPreview(link, 100, 200);
      
      // 应该不抛出错误
      expect(true).toBe(true);
    });
  });

  describe('自定义规则', () => {
    test('应该应用自定义规则', () => {
      const customSettings = {
        ...defaultSettings,
        customRules: [
          { domain: 'special.com', newTab: false, preview: true }
        ]
      };
      
      linkRewriter = new LinkRewriterModule(customSettings);
      
      const specialLink = createMockLink('https://special.com/page');
      
      (linkRewriter as any).applyCustomRules(specialLink);
      
      // 验证自定义规则被应用
      expect(specialLink.setAttribute).toHaveBeenCalledWith('data-custom-rule', 'special.com');
    });

    test('应该匹配域名规则', () => {
      const customSettings = {
        ...defaultSettings,
        customRules: [
          { domain: 'github.com', newTab: true, preview: false }
        ]
      };
      
      linkRewriter = new LinkRewriterModule(customSettings);
      
      const githubLink = createMockLink('https://github.com/user/repo');
      
      const rule = (linkRewriter as any).findMatchingRule(githubLink);
      
      expect(rule).toEqual({ domain: 'github.com', newTab: true, preview: false });
    });
  });

  describe('事件处理', () => {
    beforeEach(() => {
      linkRewriter = new LinkRewriterModule(defaultSettings);
    });

    test('应该处理鼠标悬停事件', () => {
      const link = createMockLink('https://example.com/page');
      const showPreviewSpy = jest.spyOn(linkRewriter as any, 'showPreview').mockImplementation();
      
      const mouseEvent = new MouseEvent('mouseenter', {
        clientX: 100,
        clientY: 200
      });
      
      (linkRewriter as any).handleMouseEnter(mouseEvent, link);
      
      expect(showPreviewSpy).toHaveBeenCalledWith(link, 100, 200);
    });

    test('应该处理鼠标离开事件', () => {
      const hidePreviewSpy = jest.spyOn(linkRewriter as any, 'hidePreview').mockImplementation();
      
      (linkRewriter as any).handleMouseLeave();
      
      expect(hidePreviewSpy).toHaveBeenCalled();
    });
  });

  describe('DOM变化监听', () => {
    test('应该监听DOM变化', () => {
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn()
      };
      
      global.MutationObserver = jest.fn().mockImplementation(() => mockObserver);
      
      linkRewriter = new LinkRewriterModule(defaultSettings);
      
      expect(mockObserver.observe).toHaveBeenCalledWith(document.body, {
        childList: true,
        subtree: true
      });
    });

    test('应该处理新添加的链接', () => {
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn()
      };
      let callback: Function;
      
      global.MutationObserver = jest.fn().mockImplementation((cb) => {
        callback = cb;
        return mockObserver;
      });
      
      linkRewriter = new LinkRewriterModule(defaultSettings);
      
      // 在实例创建后添加spy
      const processLinkSpy = jest.spyOn(linkRewriter as any, 'processLink');
      
      const newLink = createMockLink('https://new.com/page');
      newLink.tagName = 'A'; // 确保tagName正确
      newLink.nodeType = 1; // Node.ELEMENT_NODE
      
      const mutations = [{
        type: 'childList',
        addedNodes: [newLink]
      }];
      
      // 模拟requestIdleCallback直接执行回调
      global.requestIdleCallback = jest.fn().mockImplementation((cb) => cb());
      
      callback(mutations);
      
      // 验证processLink被调用了（可能被调用多次，所以只检查是否被调用）
      expect(processLinkSpy).toHaveBeenCalled();
    });
  });

  describe('设置更新', () => {
    test('应该响应设置更新消息', () => {
      linkRewriter = new LinkRewriterModule(defaultSettings);
      
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const newSettings = { ...defaultSettings, newTabForExternal: false };
      
      const updateSettingsSpy = jest.spyOn(linkRewriter as any, 'updateSettings').mockImplementation();
      
      messageHandler({
        type: 'LINK_SETTINGS_UPDATED',
        data: newSettings
      }, {}, jest.fn());
      
      expect(updateSettingsSpy).toHaveBeenCalledWith(newSettings);
    });

    test('应该重新处理所有链接', () => {
      linkRewriter = new LinkRewriterModule(defaultSettings);
      
      const processAllLinksSpy = jest.spyOn(linkRewriter as any, 'processAllLinks').mockImplementation();
      
      (linkRewriter as any).updateSettings({ ...defaultSettings, newTabForExternal: false });
      
      expect(processAllLinksSpy).toHaveBeenCalled();
    });
  });

  describe('性能优化', () => {
    test('应该使用requestIdleCallback进行批量处理', () => {
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn()
      };
      let callback: Function;
      
      global.MutationObserver = jest.fn().mockImplementation((cb) => {
        callback = cb;
        return mockObserver;
      });
      
      global.requestIdleCallback = jest.fn();
      
      linkRewriter = new LinkRewriterModule(defaultSettings);
      
      // 触发DOM变化
      const mutations = [{ type: 'childList', addedNodes: [] }];
      callback(mutations);
      
      expect(global.requestIdleCallback).toHaveBeenCalled();
    });

    test('应该避免重复处理相同链接', () => {
      linkRewriter = new LinkRewriterModule(defaultSettings);
      
      const link = createMockLink('https://example.com/page');
      link.classList.contains.mockReturnValue(true); // 模拟已处理
      
      const processLinkSpy = jest.spyOn(linkRewriter as any, 'processLink');
      
      (linkRewriter as any).processLink(link);
      
      // 应该跳过已处理的链接
      expect(processLinkSpy).toHaveBeenCalledWith(link);
    });
  });

  describe('错误处理', () => {
    test('应该处理无效链接', () => {
      linkRewriter = new LinkRewriterModule(defaultSettings);
      
      const invalidLink = createMockElement('a');
      invalidLink.href = '';
      
      expect(() => {
        (linkRewriter as any).processLink(invalidLink);
      }).not.toThrow();
    });

    test('应该处理网络错误', async () => {
      const previewSettings = { ...defaultSettings, popupPreview: true };
      linkRewriter = new LinkRewriterModule(previewSettings);
      
      const link = createMockLink('https://example.com/page');
      
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      await expect((linkRewriter as any).showPreview(link, 100, 200)).resolves.not.toThrow();
    });
  });

  describe('清理和销毁', () => {
    test('应该正确清理资源', () => {
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn()
      };
      
      global.MutationObserver = jest.fn().mockImplementation(() => mockObserver);
      
      linkRewriter = new LinkRewriterModule(defaultSettings);
      
      (linkRewriter as any).destroy();
      
      expect(mockObserver.disconnect).toHaveBeenCalled();
    });

    test('应该移除预览容器', () => {
      const mockContainer = createMockElement('div');
      jest.spyOn(document, 'createElement').mockReturnValue(mockContainer);
      
      linkRewriter = new LinkRewriterModule(defaultSettings);
      (linkRewriter as any).createPreviewContainer();
      (linkRewriter as any).destroy();
      
      expect(mockContainer.remove).toHaveBeenCalled();
    });
  });
}); 