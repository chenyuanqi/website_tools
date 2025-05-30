/**
 * 网页工具扩展通用工具函数
 */

/**
 * 日志输出工具
 */
const Logger = {
  prefix: '[网页工具]',
  
  log: function(message, ...args) {
    console.log(`${this.prefix} ${message}`, ...args);
  },
  
  warn: function(message, ...args) {
    console.warn(`${this.prefix} ${message}`, ...args);
  },
  
  error: function(message, ...args) {
    console.error(`${this.prefix} ${message}`, ...args);
  }
};

/**
 * DOM操作工具
 */
const DOMUtils = {
  /**
   * 等待DOM元素出现
   * @param {string} selector - CSS选择器
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<Element>}
   */
  waitForElement: function(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`元素 ${selector} 在 ${timeout}ms 内未找到`));
      }, timeout);
    });
  },
  
  /**
   * 创建元素
   * @param {string} tag - 标签名
   * @param {Object} attributes - 属性对象
   * @param {string} textContent - 文本内容
   * @returns {Element}
   */
  createElement: function(tag, attributes = {}, textContent = '') {
    const element = document.createElement(tag);
    
    Object.keys(attributes).forEach(key => {
      if (key === 'className') {
        element.className = attributes[key];
      } else if (key === 'style' && typeof attributes[key] === 'object') {
        Object.assign(element.style, attributes[key]);
      } else {
        element.setAttribute(key, attributes[key]);
      }
    });
    
    if (textContent) {
      element.textContent = textContent;
    }
    
    return element;
  },
  
  /**
   * 添加CSS样式
   * @param {string} css - CSS样式字符串
   * @param {string} id - 样式标签ID
   */
  addCSS: function(css, id = 'website-tools-styles') {
    // 避免重复添加
    if (document.getElementById(id)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }
};

/**
 * URL工具
 */
const URLUtils = {
  /**
   * 判断是否为外部链接
   * @param {string} url - 链接地址
   * @returns {boolean}
   */
  isExternalLink: function(url) {
    try {
      const link = new URL(url, window.location.href);
      return link.hostname !== window.location.hostname;
    } catch (e) {
      return false;
    }
  },
  
  /**
   * 获取文件扩展名
   * @param {string} url - 文件URL
   * @returns {string}
   */
  getFileExtension: function(url) {
    try {
      const pathname = new URL(url).pathname;
      const extension = pathname.split('.').pop().toLowerCase();
      return extension;
    } catch (e) {
      return '';
    }
  },
  
  /**
   * 判断是否为图片链接
   * @param {string} url - 链接地址
   * @returns {boolean}
   */
  isImageUrl: function(url) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const extension = this.getFileExtension(url);
    return imageExtensions.includes(extension);
  },
  
  /**
   * 判断是否为视频链接
   * @param {string} url - 链接地址
   * @returns {boolean}
   */
  isVideoUrl: function(url) {
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    const extension = this.getFileExtension(url);
    return videoExtensions.includes(extension);
  }
};

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间
 * @returns {Function}
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制
 * @returns {Function}
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 生成唯一ID
 * @returns {string}
 */
function generateId() {
  return 'wt_' + Math.random().toString(36).substr(2, 9);
}

// 导出工具函数（如果在模块环境中）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Logger,
    DOMUtils,
    URLUtils,
    debounce,
    throttle,
    generateId
  };
} 