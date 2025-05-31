/**
 * 链接管理模块 - 链接重写器
 * 实现新标签页打开和预览功能
 */

import { sendToBg } from '@shared/messaging';

interface LinkRewriteSettings {
  enabled: boolean;
  newTabForExternal: boolean;
  popupPreview: boolean;
  customRules: Array<{
    domain: string;
    action: 'newTab' | 'preview' | 'ignore';
  }>;
}

export class LinkRewriterModule {
  private settings: LinkRewriteSettings;
  private processedLinks = new Set<HTMLAnchorElement>();
  private mutationObserver: MutationObserver | null = null;
  private previewContainer: HTMLElement | null = null;
  private currentPreviewUrl: string | null = null;

  constructor(settings: LinkRewriteSettings) {
    this.settings = settings;
    this.init();
  }

  private init(): void {
    console.log('[链接管理] 链接重写模块初始化');
    
    // 监听消息
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // 处理现有链接
    this.processAllLinks();
    
    // 监听DOM变化
    this.startMutationObserver();
    
    // 创建预览容器
    if (this.settings.popupPreview) {
      this.createPreviewContainer();
    }
  }

  private handleMessage(request: any, sender: any, sendResponse: Function): void {
    const { type, data } = request;
    
    switch (type) {
      case 'ENABLE_NEW_TAB_MODE':
        this.settings.newTabForExternal = data.enabled;
        this.reprocessAllLinks();
        sendResponse({ success: true });
        break;
      case 'ENABLE_PREVIEW_MODE':
        this.settings.popupPreview = data.enabled;
        if (data.enabled) {
          this.createPreviewContainer();
        } else {
          this.removePreviewContainer();
        }
        sendResponse({ success: true });
        break;
      case 'GET_LINK_STATS':
        sendResponse(this.getLinkStats());
        break;
    }
  }

  private processAllLinks(): void {
    const links = document.querySelectorAll('a[href]') as NodeListOf<HTMLAnchorElement>;
    links.forEach(link => this.processLink(link));
  }

  private reprocessAllLinks(): void {
    // 清理已处理的链接
    this.processedLinks.forEach(link => {
      this.cleanupLink(link);
    });
    this.processedLinks.clear();
    
    // 重新处理所有链接
    this.processAllLinks();
  }

  private processLink(link: HTMLAnchorElement): void {
    if (this.processedLinks.has(link)) return;
    
    try {
      const url = new URL(link.href);
      const isExternal = this.isExternalLink(url);
      const action = this.getLinkAction(url, isExternal);
      
      // 标记链接类型
      link.classList.add(isExternal ? 'yuanqi-external-link' : 'yuanqi-internal-link');
      
      // 应用处理逻辑
      switch (action) {
        case 'newTab':
          this.setupNewTabLink(link, isExternal);
          break;
        case 'preview':
          this.setupPreviewLink(link);
          break;
        case 'ignore':
          // 不做处理
          break;
      }
      
      this.processedLinks.add(link);
      
    } catch (error) {
      // 忽略无效URL
      console.debug('[链接管理] 无效链接:', link.href);
    }
  }

  private isExternalLink(url: URL): boolean {
    return url.hostname !== window.location.hostname;
  }

  private getLinkAction(url: URL, isExternal: boolean): 'newTab' | 'preview' | 'ignore' {
    // 检查自定义规则
    const customRule = this.settings.customRules.find(rule => 
      url.hostname.includes(rule.domain)
    );
    if (customRule) {
      return customRule.action;
    }
    
    // 默认规则
    if (this.settings.newTabForExternal && isExternal) {
      return 'newTab';
    }
    
    if (this.settings.popupPreview) {
      return 'preview';
    }
    
    return 'ignore';
  }

  private setupNewTabLink(link: HTMLAnchorElement, isExternal: boolean): void {
    // 保存原有属性
    if (link.hasAttribute('target')) {
      link.setAttribute('data-original-target', link.getAttribute('target')!);
    }
    if (link.hasAttribute('rel')) {
      link.setAttribute('data-original-rel', link.getAttribute('rel')!);
    }
    
    // 设置新标签页打开
    link.setAttribute('target', '_blank');
    
    // 为外部链接添加安全属性
    if (isExternal) {
      const existingRel = link.getAttribute('rel') || '';
      const relParts = existingRel.split(' ').filter(part => part.trim());
      if (!relParts.includes('noopener')) relParts.push('noopener');
      if (!relParts.includes('noreferrer')) relParts.push('noreferrer');
      link.setAttribute('rel', relParts.join(' '));
      
      // 添加外部链接图标
      this.addExternalLinkIcon(link);
    }
  }

  private setupPreviewLink(link: HTMLAnchorElement): void {
    // 添加悬停预览
    link.addEventListener('mouseenter', (e) => {
      this.showPreview(link.href, e);
    });
    
    link.addEventListener('mouseleave', () => {
      this.hidePreview();
    });
    
    // 添加预览图标
    this.addPreviewIcon(link);
  }

  private addExternalLinkIcon(link: HTMLAnchorElement): void {
    if (link.querySelector('.yuanqi-external-icon')) return;
    
    const icon = document.createElement('span');
    icon.className = 'yuanqi-external-icon';
    icon.innerHTML = '↗';
    icon.style.cssText = `
      margin-left: 2px;
      font-size: 0.8em;
      opacity: 0.7;
      color: #666;
    `;
    link.appendChild(icon);
  }

  private addPreviewIcon(link: HTMLAnchorElement): void {
    if (link.querySelector('.yuanqi-preview-icon')) return;
    
    const icon = document.createElement('span');
    icon.className = 'yuanqi-preview-icon';
    icon.innerHTML = '👁';
    icon.style.cssText = `
      margin-left: 2px;
      font-size: 0.8em;
      opacity: 0.7;
    `;
    link.appendChild(icon);
  }

  private createPreviewContainer(): void {
    if (this.previewContainer) return;
    
    this.previewContainer = document.createElement('div');
    this.previewContainer.id = 'yuanqi-link-preview';
    this.previewContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 400px;
      height: 300px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 10000;
      display: none;
      overflow: hidden;
    `;
    
    // 创建预览内容区域
    const content = document.createElement('div');
    content.className = 'preview-content';
    content.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
    `;
    
    // 创建加载指示器
    const loader = document.createElement('div');
    loader.className = 'preview-loader';
    loader.innerHTML = '加载中...';
    loader.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #666;
    `;
    
    content.appendChild(loader);
    this.previewContainer.appendChild(content);
    document.body.appendChild(this.previewContainer);
  }

  private removePreviewContainer(): void {
    if (this.previewContainer) {
      this.previewContainer.remove();
      this.previewContainer = null;
    }
  }

  private async showPreview(url: string, event: MouseEvent): Promise<void> {
    if (!this.previewContainer || this.currentPreviewUrl === url) return;
    
    this.currentPreviewUrl = url;
    
    // 定位预览窗口
    const x = Math.min(event.clientX + 10, window.innerWidth - 420);
    const y = Math.min(event.clientY + 10, window.innerHeight - 320);
    
    this.previewContainer.style.left = `${x}px`;
    this.previewContainer.style.top = `${y}px`;
    this.previewContainer.style.display = 'block';
    
    // 清空之前的内容
    const content = this.previewContainer.querySelector('.preview-content')!;
    content.innerHTML = '<div class="preview-loader">加载中...</div>';
    
    try {
      // 使用轻量方案：第三方文本提取API
      const previewData = await this.fetchPreviewData(url);
      this.renderPreview(previewData);
    } catch (error) {
      console.warn('[链接管理] 预览加载失败:', error);
      this.renderPreviewError();
    }
  }

  private hidePreview(): void {
    if (this.previewContainer) {
      this.previewContainer.style.display = 'none';
      this.currentPreviewUrl = null;
    }
  }

  private async fetchPreviewData(url: string): Promise<any> {
    // 使用 r.jina.ai 或类似服务获取页面摘要
    const apiUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('预览服务不可用');
    }
    
    return await response.json();
  }

  private renderPreview(data: any): void {
    if (!this.previewContainer) return;
    
    const content = this.previewContainer.querySelector('.preview-content')!;
    content.innerHTML = `
      <div style="padding: 16px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">
          ${data.title || '无标题'}
        </h3>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #666; line-height: 1.4;">
          ${data.description || '无描述'}
        </p>
        <div style="font-size: 12px; color: #999;">
          ${data.url || this.currentPreviewUrl}
        </div>
      </div>
    `;
  }

  private renderPreviewError(): void {
    if (!this.previewContainer) return;
    
    const content = this.previewContainer.querySelector('.preview-content')!;
    content.innerHTML = `
      <div style="padding: 16px; text-align: center; color: #999;">
        <div>预览不可用</div>
        <div style="font-size: 12px; margin-top: 8px;">
          ${this.currentPreviewUrl}
        </div>
      </div>
    `;
  }

  private cleanupLink(link: HTMLAnchorElement): void {
    // 恢复原有属性
    if (link.hasAttribute('data-original-target')) {
      link.setAttribute('target', link.getAttribute('data-original-target')!);
      link.removeAttribute('data-original-target');
    } else {
      link.removeAttribute('target');
    }
    
    if (link.hasAttribute('data-original-rel')) {
      link.setAttribute('rel', link.getAttribute('data-original-rel')!);
      link.removeAttribute('data-original-rel');
    } else {
      link.removeAttribute('rel');
    }
    
    // 移除添加的图标和类名
    link.classList.remove('yuanqi-external-link', 'yuanqi-internal-link');
    link.querySelector('.yuanqi-external-icon')?.remove();
    link.querySelector('.yuanqi-preview-icon')?.remove();
  }

  private startMutationObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      // 节流处理
      requestIdleCallback(() => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                
                // 处理新添加的链接
                if (element.tagName === 'A' && (element as HTMLAnchorElement).href) {
                  this.processLink(element as HTMLAnchorElement);
                } else {
                  // 处理包含链接的元素
                  const links = element.querySelectorAll('a[href]') as NodeListOf<HTMLAnchorElement>;
                  links.forEach(link => this.processLink(link));
                }
              }
            });
          }
        });
      });
    });
    
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private getLinkStats(): any {
    const allLinks = document.querySelectorAll('a[href]');
    const externalLinks = document.querySelectorAll('.yuanqi-external-link');
    const internalLinks = document.querySelectorAll('.yuanqi-internal-link');
    
    return {
      total: allLinks.length,
      external: externalLinks.length,
      internal: internalLinks.length,
      processed: this.processedLinks.size
    };
  }

  public updateSettings(newSettings: Partial<LinkRewriteSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.reprocessAllLinks();
    
    // 更新预览容器
    if (this.settings.popupPreview && !this.previewContainer) {
      this.createPreviewContainer();
    } else if (!this.settings.popupPreview && this.previewContainer) {
      this.removePreviewContainer();
    }
  }

  public destroy(): void {
    // 清理所有处理过的链接
    this.processedLinks.forEach(link => {
      this.cleanupLink(link);
    });
    this.processedLinks.clear();
    
    // 停止DOM监听
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    // 移除预览容器
    this.removePreviewContainer();
    
    // 移除消息监听器
    chrome.runtime.onMessage.removeListener(this.handleMessage.bind(this));
  }
}

// 自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    const result = await chrome.storage.sync.get(['websiteToolsSettings']);
    const settings = result.websiteToolsSettings?.linkManager || {
      enabled: true,
      newTabForExternal: true,
      popupPreview: false,
      customRules: []
    };
    
    if (settings.enabled) {
      new LinkRewriterModule(settings);
    }
  });
} else {
  // DOM已加载完成
  chrome.storage.sync.get(['websiteToolsSettings']).then(result => {
    const settings = result.websiteToolsSettings?.linkManager || {
      enabled: true,
      newTabForExternal: true,
      popupPreview: false,
      customRules: []
    };
    
    if (settings.enabled) {
      new LinkRewriterModule(settings);
    }
  });
} 