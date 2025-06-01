/**
 * Jest测试环境设置
 * 模拟Chrome扩展API和浏览器环境
 */

// 模拟Chrome扩展API
const mockChrome = {
  // 存储API
  storage: {
    local: {
      get: jest.fn().mockImplementation((keys, callback) => {
        const result = {};
        if (typeof keys === 'string') {
          result[keys] = null;
        } else if (Array.isArray(keys)) {
          keys.forEach(key => result[key] = null);
        } else if (typeof keys === 'object') {
          Object.assign(result, keys);
        }
        if (callback) callback(result);
        return Promise.resolve(result);
      }),
      set: jest.fn().mockImplementation((items, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: jest.fn().mockImplementation((keys, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      clear: jest.fn().mockImplementation((callback) => {
        if (callback) callback();
        return Promise.resolve();
      })
    },
    sync: {
      get: jest.fn().mockImplementation((keys, callback) => {
        const result = {};
        if (typeof keys === 'string') {
          result[keys] = null;
        } else if (Array.isArray(keys)) {
          keys.forEach(key => result[key] = null);
        } else if (typeof keys === 'object') {
          Object.assign(result, keys);
        }
        if (callback) callback(result);
        return Promise.resolve(result);
      }),
      set: jest.fn().mockImplementation((items, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: jest.fn().mockImplementation((keys, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      clear: jest.fn().mockImplementation((callback) => {
        if (callback) callback();
        return Promise.resolve();
      })
    }
  },

  // 运行时API
  runtime: {
    sendMessage: jest.fn().mockImplementation((message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn().mockReturnValue(false)
    },
    connect: jest.fn().mockReturnValue({
      postMessage: jest.fn(),
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      onDisconnect: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    }),
    getURL: jest.fn().mockImplementation((path) => `chrome-extension://test-id/${path}`),
    id: 'test-extension-id',
    getManifest: jest.fn().mockReturnValue({
      name: 'Test Extension',
      version: '1.0.0'
    })
  },

  // 下载API
  downloads: {
    download: jest.fn().mockImplementation((options, callback) => {
      const downloadId = Math.floor(Math.random() * 1000);
      if (callback) callback(downloadId);
      return Promise.resolve(downloadId);
    }),
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },

  // 标签页API
  tabs: {
    query: jest.fn().mockImplementation((queryInfo, callback) => {
      const tabs = [{ id: 1, url: 'https://example.com', active: true }];
      if (callback) callback(tabs);
      return Promise.resolve(tabs);
    }),
    create: jest.fn().mockImplementation((createProperties, callback) => {
      const tab = { id: 2, url: createProperties.url };
      if (callback) callback(tab);
      return Promise.resolve(tab);
    }),
    sendMessage: jest.fn().mockImplementation((tabId, message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    })
  },

  // 脚本注入API
  scripting: {
    executeScript: jest.fn().mockImplementation((injection, callback) => {
      const results = [{ result: 'success' }];
      if (callback) callback(results);
      return Promise.resolve(results);
    }),
    insertCSS: jest.fn().mockImplementation((injection, callback) => {
      if (callback) callback();
      return Promise.resolve();
    }),
    removeCSS: jest.fn().mockImplementation((injection, callback) => {
      if (callback) callback();
      return Promise.resolve();
    })
  },

  // 扩展图标API
  action: {
    setBadgeText: jest.fn().mockImplementation((details, callback) => {
      if (callback) callback();
      return Promise.resolve();
    }),
    setBadgeBackgroundColor: jest.fn().mockImplementation((details, callback) => {
      if (callback) callback();
      return Promise.resolve();
    }),
    setIcon: jest.fn().mockImplementation((details, callback) => {
      if (callback) callback();
      return Promise.resolve();
    })
  }
};

// 设置全局Chrome对象
Object.defineProperty(global, 'chrome', {
  value: mockChrome,
  writable: true
});

// 创建更完整的DOM元素Mock
const createMockElement = (tagName: string = 'div') => {
  const element = {
    tagName: tagName.toUpperCase(),
    nodeType: 1, // Node.ELEMENT_NODE
    style: {},
    className: '',
    _id: '',
    innerHTML: '',
    textContent: '',
    src: '',
    href: '',
    alt: '',
    title: '',
    width: 0,
    height: 0,
    dataset: {},
    contentEditable: 'false',
    oncontextmenu: null,
    onselectstart: null,
    ondragstart: null,
    onkeydown: jest.fn(),
    onkeyup: jest.fn(),
    onkeypress: jest.fn(),
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    hasAttribute: jest.fn().mockReturnValue(false),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    cloneNode: jest.fn().mockReturnThis(),
    replaceWith: jest.fn(),
    remove: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn().mockReturnValue([]),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn().mockReturnValue(false),
      toggle: jest.fn()
    }
  };

  // 使用getter/setter使id属性可以正确赋值和读取
  Object.defineProperty(element, 'id', {
    get() {
      return this._id;
    },
    set(value) {
      this._id = value;
    },
    enumerable: true,
    configurable: true
  });

  return element;
};

// 模拟MutationObserver
global.MutationObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn().mockReturnValue([])
}));

// 扩展现有window对象而不是替换
if (typeof window !== 'undefined') {
  // 安全地设置location属性，避免重定义错误
  try {
    if (window.location) {
      // 尝试设置属性，如果失败则跳过
      try {
        Object.defineProperty(window.location, 'hostname', {
          value: 'example.com',
          writable: true,
          configurable: true
        });
      } catch (e) {
        // 如果无法重定义，则使用现有值
      }
      
      try {
        Object.defineProperty(window.location, 'href', {
          value: 'https://example.com/test',
          writable: true,
          configurable: true
        });
      } catch (e) {
        // 如果无法重定义，则使用现有值
      }
      
      try {
        Object.defineProperty(window.location, 'origin', {
          value: 'https://example.com',
          writable: true,
          configurable: true
        });
      } catch (e) {
        // 如果无法重定义，则使用现有值
      }
      
      try {
        Object.defineProperty(window.location, 'protocol', {
          value: 'https:',
          writable: true,
          configurable: true
        });
      } catch (e) {
        // 如果无法重定义，则使用现有值
      }
      
      try {
        Object.defineProperty(window.location, 'host', {
          value: 'example.com',
          writable: true,
          configurable: true
        });
      } catch (e) {
        // 如果无法重定义，则使用现有值
      }
      
      try {
        Object.defineProperty(window.location, 'pathname', {
          value: '/test',
          writable: true,
          configurable: true
        });
      } catch (e) {
        // 如果无法重定义，则使用现有值
      }
      
      try {
        Object.defineProperty(window.location, 'reload', {
          value: jest.fn(),
          writable: true,
          configurable: true
        });
      } catch (e) {
        // 如果无法重定义，则跳过
      }
    }
  } catch (e) {
    // 如果location对象不可访问，则跳过
  }
  
  Object.assign(window, {
    getSelection: jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue(''),
      removeAllRanges: jest.fn(),
      addRange: jest.fn()
    }),
    getComputedStyle: jest.fn().mockReturnValue({
      backgroundImage: 'none',
      userSelect: 'auto',
      pointerEvents: 'auto'
    }),
    requestIdleCallback: jest.fn().mockImplementation((callback) => {
      setTimeout(callback, 0);
      return 1;
    }),
    cancelIdleCallback: jest.fn(),
    scrollTo: jest.fn()
  });
}

// 扩展现有document对象而不是替换
if (typeof document !== 'undefined') {
  // 扩展现有的body和documentElement，而不是替换
  if (document.body) {
    Object.assign(document.body, {
      contentEditable: 'false',
      oncontextmenu: null,
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      cloneNode: jest.fn().mockReturnValue(createMockElement('body')),
      replaceWith: jest.fn()
    });
  }
  
  if (document.documentElement) {
    Object.assign(document.documentElement, {
      cloneNode: jest.fn().mockReturnValue(createMockElement('html')),
      replaceWith: jest.fn()
    });
  }
  
  // 扩展document对象
  Object.assign(document, {
    designMode: 'off',
    oncontextmenu: null,
    querySelector: jest.fn(),
    querySelectorAll: jest.fn().mockReturnValue([]),
    getElementById: jest.fn(),
    getElementsByClassName: jest.fn().mockReturnValue([]),
    getElementsByTagName: jest.fn().mockReturnValue([]),
    createElement: jest.fn().mockImplementation((tagName) => createMockElement(tagName)),
    createTextNode: jest.fn().mockImplementation((text) => ({ textContent: text })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  });
  
  // 确保head存在并可用
  if (document.head) {
    Object.assign(document.head, {
      appendChild: jest.fn(),
      removeChild: jest.fn()
    });
  }
}

// 模拟全局函数
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
  blob: jest.fn().mockResolvedValue(new Blob())
});

// 模拟URL构造函数
global.URL = jest.fn().mockImplementation((url, base) => {
  const mockUrl = {
    href: url,
    origin: 'https://example.com',
    protocol: 'https:',
    host: 'example.com',
    hostname: 'example.com',
    port: '',
    pathname: '/',
    search: '',
    hash: ''
  };
  
  // 简单的URL解析
  if (url.startsWith('http')) {
    try {
      const parsed = new (jest.requireActual('url').URL)(url);
      Object.assign(mockUrl, {
        href: parsed.href,
        origin: parsed.origin,
        protocol: parsed.protocol,
        host: parsed.host,
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash
      });
    } catch (e) {
      // 使用默认值
    }
  }
  
  return mockUrl;
});

// 模拟Blob构造函数
global.Blob = jest.fn().mockImplementation((parts, options) => ({
  size: 0,
  type: options?.type || '',
  slice: jest.fn(),
  stream: jest.fn(),
  text: jest.fn().mockResolvedValue(''),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
}));

// 设置测试超时
jest.setTimeout(10000);

// 清理函数
afterEach(() => {
  jest.clearAllMocks();
  
  // 重置document状态
  if (typeof document !== 'undefined') {
    if (document.body) {
      document.body.contentEditable = 'false';
    }
    document.designMode = 'off';
    document.oncontextmenu = null;
    if (document.body) {
      document.body.oncontextmenu = null;
    }
  }
});

// 错误处理
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// 导出工具函数供测试使用
export { createMockElement }; 