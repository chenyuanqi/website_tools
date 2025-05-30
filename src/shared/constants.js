/**
 * 网页工具扩展常量定义
 */

// 应用信息
export const APP_INFO = {
    ID: 'website-tools-extension',
    NAME: '元气助手',
    VERSION: '1.0.0',
    AUTHOR: 'AI进化论-花生'
};

// 扩展基本信息
const EXTENSION_INFO = {
  NAME: '网页工具箱',
  VERSION: '1.0.0',
  ID: 'website-tools-extension'
};

// 功能模块标识
const MODULES = {
  LINK_MANAGER: 'linkManager',
  COPY_FREEDOM: 'copyFreedom',
  MEDIA_EXTRACTOR: 'mediaExtractor'
};

// 消息类型
const MESSAGE_TYPES = {
  // 链接管理相关
  OPEN_LINK_IN_NEW_TAB: 'openLinkInNewTab',
  SHOW_LINK_PREVIEW: 'showLinkPreview',
  GET_LINK_STATS: 'getLinkStats',
  ENABLE_NEW_TAB_MODE: 'enableNewTabMode',
  ENABLE_PREVIEW_MODE: 'enablePreviewMode',
  
  // 复制限制解除相关
  ENABLE_TEXT_SELECTION: 'enableTextSelection',
  RESTORE_RIGHT_CLICK: 'restoreRightClick',
  RESTORE_SHORTCUTS: 'restoreShortcuts',
  RESTORE_KEYBOARD_SHORTCUTS: 'restoreKeyboardShortcuts',
  
  // 媒体提取相关
  EXTRACT_IMAGES: 'extractImages',
  EXTRACT_VIDEOS: 'extractVideos',
  EXTRACT_AUDIO: 'extractAudio',
  GET_MEDIA_STATS: 'getMediaStats',
  
  // 设置相关
  GET_SETTINGS: 'getSettings',
  UPDATE_SETTINGS: 'updateSettings',
  
  // 通用消息
  GET_PAGE_INFO: 'getPageInfo',
  SHOW_NOTIFICATION: 'showNotification'
};

// 默认设置
const DEFAULT_SETTINGS = {
  [MODULES.LINK_MANAGER]: {
    enabled: true,
    newTabForExternal: true,
    popupPreview: false,
    customRules: []
  },
  [MODULES.COPY_FREEDOM]: {
    enabled: true,
    textSelection: true,
    rightClickMenu: true,
    keyboardShortcuts: true
  },
  [MODULES.MEDIA_EXTRACTOR]: {
    enabled: true,
    autoDetectImages: true,
    autoDetectVideos: false,
    autoDetectAudio: false
  }
};

// CSS类名前缀
const CSS_PREFIX = 'website-tools';

// 存储键名
const STORAGE_KEYS = {
  SETTINGS: 'websiteToolsSettings',
  WHITELIST: 'websiteToolsWhitelist',
  STATISTICS: 'websiteToolsStatistics'
};

// 导出常量（如果在模块环境中）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EXTENSION_INFO,
    MODULES,
    MESSAGE_TYPES,
    DEFAULT_SETTINGS,
    CSS_PREFIX,
    STORAGE_KEYS
  };
} 