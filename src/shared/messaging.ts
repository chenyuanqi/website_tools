/**
 * 统一消息通信模块
 * 处理扩展内部的消息传递
 */

export interface Message {
  type: string;
  data?: any;
  timestamp?: number;
}

export interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * 发送消息给 background script
 */
export async function sendToBg(message: Message): Promise<MessageResponse> {
  return new Promise((resolve, reject) => {
    const messageWithTimestamp = {
      ...message,
      timestamp: Date.now()
    };
    
    chrome.runtime.sendMessage(messageWithTimestamp, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response || { success: true });
      }
    });
  });
}

/**
 * 发送消息给 content script
 */
export async function sendToContent(tabId: number, message: Message): Promise<MessageResponse> {
  return new Promise((resolve, reject) => {
    const messageWithTimestamp = {
      ...message,
      timestamp: Date.now()
    };
    
    chrome.tabs.sendMessage(tabId, messageWithTimestamp, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response || { success: true });
      }
    });
  });
}

/**
 * 广播消息给所有标签页
 */
export async function broadcastToAllTabs(message: Message): Promise<void> {
  const tabs = await chrome.tabs.query({});
  const promises = tabs.map(tab => {
    if (tab.id) {
      return sendToContent(tab.id, message).catch(() => {
        // 忽略发送失败的标签页
      });
    }
  });
  
  await Promise.allSettled(promises);
}

/**
 * 消息类型常量
 */
export const MessageTypes = {
  // 复制自由相关
  ENABLE_TEXT_SELECTION: 'ENABLE_TEXT_SELECTION',
  DISABLE_TEXT_SELECTION: 'DISABLE_TEXT_SELECTION',
  TOGGLE_TEXT_SELECTION: 'TOGGLE_TEXT_SELECTION',
  RESTORE_RIGHT_CLICK: 'RESTORE_RIGHT_CLICK',
  RESTORE_SHORTCUTS: 'RESTORE_SHORTCUTS',
  
  // 链接管理相关
  ENABLE_NEW_TAB_MODE: 'ENABLE_NEW_TAB_MODE',
  ENABLE_PREVIEW_MODE: 'ENABLE_PREVIEW_MODE',
  GET_LINK_STATS: 'GET_LINK_STATS',
  
  // 媒体提取相关
  EXTRACT_IMAGES: 'EXTRACT_IMAGES',
  EXTRACT_VIDEOS: 'EXTRACT_VIDEOS',
  EXTRACT_AUDIO: 'EXTRACT_AUDIO',
  GET_MEDIA_STATS: 'GET_MEDIA_STATS',
  DOWNLOAD_ASSET: 'DOWNLOAD_ASSET',
  
  // 设置相关
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  GET_SETTINGS: 'GET_SETTINGS',
  
  // 通用
  GET_PAGE_INFO: 'GET_PAGE_INFO',
  PING: 'PING',
  
  // 通知事件
  SELECTION_UNLOCK_ENABLED: 'SELECTION_UNLOCK_ENABLED',
  IMAGES_COLLECTED: 'IMAGES_COLLECTED',
  CONTENT_SCRIPT_READY: 'CONTENT_SCRIPT_READY'
} as const;

/**
 * 消息处理器基类
 */
export abstract class MessageHandler {
  protected handlers = new Map<string, Function>();
  
  constructor() {
    this.setupMessageListener();
  }
  
  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const handler = this.handlers.get(request.type);
      if (handler) {
        try {
          const result = handler(request, sender);
          if (result instanceof Promise) {
            result.then(sendResponse).catch(error => {
              sendResponse({ success: false, error: error.message });
            });
            return true; // 保持消息通道开放
          } else {
            sendResponse(result);
          }
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
      }
    });
  }
  
  protected registerHandler(type: string, handler: Function): void {
    this.handlers.set(type, handler);
  }
  
  protected unregisterHandler(type: string): void {
    this.handlers.delete(type);
  }
  
  public destroy(): void {
    this.handlers.clear();
  }
} 