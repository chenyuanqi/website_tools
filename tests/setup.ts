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

// 模拟浏览器环境 - 只添加必要的方法，不修改location
if (typeof window !== 'undefined') {
  // 扩展现有window对象
  Object.assign(window, {
    getSelection: jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue(''),
      removeAllRanges: jest.fn(),
      addRange: jest.fn()
    }),
    getComputedStyle: jest.fn().mockReturnValue({}),
    requestIdleCallback: jest.fn().mockImplementation((callback) => {
      setTimeout(callback, 0);
      return 1;
    }),
    cancelIdleCallback: jest.fn()
  });
}

// 模拟DOM API - 扩展现有document对象
if (typeof document !== 'undefined') {
  // 扩展现有document对象
  Object.assign(document, {
    querySelector: jest.fn(),
    querySelectorAll: jest.fn().mockReturnValue([]),
    getElementById: jest.fn(),
    getElementsByClassName: jest.fn().mockReturnValue([]),
    getElementsByTagName: jest.fn().mockReturnValue([]),
    createElement: jest.fn().mockImplementation((tagName) => ({
      tagName: tagName.toUpperCase(),
      style: {},
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
      removeAttribute: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      cloneNode: jest.fn().mockReturnThis(),
      replaceWith: jest.fn()
    })),
    createTextNode: jest.fn().mockImplementation((text) => ({ textContent: text }))
  });
}

// 模拟全局函数
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
  blob: jest.fn().mockResolvedValue(new Blob())
});

// 模拟URL构造函数
global.URL = jest.fn().mockImplementation((url, base) => ({
  href: url,
  origin: 'https://example.com',
  protocol: 'https:',
  host: 'example.com',
  hostname: 'example.com',
  port: '',
  pathname: '/',
  search: '',
  hash: ''
}));

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
});

// 错误处理
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// 抑制控制台警告（可选）
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  // 过滤掉一些已知的无害警告
  const message = args.join(' ');
  if (message.includes('jsdom')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
}; 