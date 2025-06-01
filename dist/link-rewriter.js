var _ = function(exports) {
  "use strict";
  class LinkRewriterModule {
    constructor(settings) {
      this.processedLinks = /* @__PURE__ */ new Set();
      this.mutationObserver = null;
      this.previewContainer = null;
      this.currentPreviewUrl = null;
      this.settings = settings;
      this.init();
    }
    init() {
      console.log("[链接管理] 链接重写模块初始化");
      chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
      this.processAllLinks();
      this.startMutationObserver();
      if (this.settings.popupPreview) {
        this.createPreviewContainer();
      }
    }
    handleMessage(request, sender, sendResponse) {
      const { type, data } = request;
      switch (type) {
        case "ENABLE_NEW_TAB_MODE":
          this.settings.newTabForExternal = data.enabled;
          this.reprocessAllLinks();
          sendResponse({ success: true });
          break;
        case "ENABLE_PREVIEW_MODE":
          this.settings.popupPreview = data.enabled;
          if (data.enabled) {
            this.createPreviewContainer();
          } else {
            this.removePreviewContainer();
          }
          sendResponse({ success: true });
          break;
        case "LINK_SETTINGS_UPDATED":
          this.updateSettings(data);
          sendResponse({ success: true });
          break;
        case "GET_LINK_STATS":
          sendResponse(this.getLinkStats());
          break;
      }
    }
    processAllLinks() {
      const links = document.querySelectorAll("a[href]");
      links.forEach((link) => this.processLink(link));
    }
    reprocessAllLinks() {
      this.processedLinks.forEach((link) => {
        this.cleanupLink(link);
      });
      this.processedLinks.clear();
      this.processAllLinks();
    }
    processLink(link) {
      if (this.processedLinks.has(link) || !link.href) return;
      try {
        const url = new URL(link.href);
        const isExternal = this.isExternalLink(url);
        const action = this.getLinkAction(url, isExternal);
        link.classList.add(isExternal ? "yuanqi-external-link" : "yuanqi-internal-link");
        this.applyCustomRules(link);
        switch (action) {
          case "newTab":
            this.setupNewTabLink(link, isExternal);
            break;
          case "preview":
            this.setupPreviewLink(link);
            break;
          case "ignore":
            break;
        }
        this.processedLinks.add(link);
      } catch (error) {
        console.debug("[链接管理] 无效链接:", link.href);
      }
    }
    isExternalLink(url) {
      return url.hostname !== window.location.hostname;
    }
    getLinkAction(url, isExternal) {
      const customRule = this.settings.customRules.find(
        (rule) => url.hostname.includes(rule.domain)
      );
      if (customRule) {
        return customRule.action;
      }
      if (this.settings.newTabForExternal && isExternal) {
        return "newTab";
      }
      if (this.settings.popupPreview) {
        return "preview";
      }
      return "ignore";
    }
    applyCustomRules(link) {
      try {
        const url = new URL(link.href);
        const rule = this.findMatchingRule(link);
        if (rule) {
          link.setAttribute("data-custom-rule", rule.domain);
        }
      } catch (error) {
      }
    }
    findMatchingRule(link) {
      try {
        const url = new URL(link.href);
        return this.settings.customRules.find(
          (rule) => url.hostname.includes(rule.domain)
        );
      } catch (error) {
        return null;
      }
    }
    setupNewTabLink(link, isExternal) {
      if (link.hasAttribute("target")) {
        link.setAttribute("data-original-target", link.getAttribute("target"));
      }
      if (link.hasAttribute("rel")) {
        link.setAttribute("data-original-rel", link.getAttribute("rel"));
      }
      link.setAttribute("target", "_blank");
      if (isExternal) {
        const existingRel = link.getAttribute("rel") || "";
        const relParts = existingRel.split(" ").filter((part) => part.trim());
        if (!relParts.includes("noopener")) relParts.push("noopener");
        if (!relParts.includes("noreferrer")) relParts.push("noreferrer");
        link.setAttribute("rel", relParts.join(" "));
        this.addExternalLinkIcon(link);
      }
    }
    setupPreviewLink(link) {
      link.addEventListener("mouseenter", (e) => {
        this.handleMouseEnter(e, link);
      });
      link.addEventListener("mouseleave", () => {
        this.handleMouseLeave();
      });
      this.addPreviewIcon(link);
    }
    handleMouseEnter(event, link) {
      this.showPreview(link, event.clientX, event.clientY);
    }
    handleMouseLeave() {
      this.hidePreview();
    }
    addExternalLinkIcon(link) {
      if (link.querySelector(".yuanqi-external-icon")) return;
      const icon = document.createElement("span");
      icon.className = "yuanqi-external-icon";
      icon.innerHTML = "↗";
      icon.style.cssText = `
      margin-left: 2px;
      font-size: 0.8em;
      opacity: 0.7;
      color: #666;
    `;
      link.appendChild(icon);
    }
    addPreviewIcon(link) {
      if (link.querySelector(".yuanqi-preview-icon")) return;
      const icon = document.createElement("span");
      icon.className = "yuanqi-preview-icon";
      icon.innerHTML = "👁";
      icon.style.cssText = `
      margin-left: 2px;
      font-size: 0.8em;
      opacity: 0.7;
    `;
      link.appendChild(icon);
    }
    createPreviewContainer() {
      if (this.previewContainer) return;
      this.previewContainer = document.createElement("div");
      this.previewContainer.id = "yuanqi-link-preview";
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
      const content = document.createElement("div");
      content.className = "preview-content";
      content.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
    `;
      const loader = document.createElement("div");
      loader.className = "preview-loader";
      loader.innerHTML = "加载中...";
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
    removePreviewContainer() {
      if (this.previewContainer) {
        this.previewContainer.remove();
        this.previewContainer = null;
      }
    }
    async showPreview(link, x, y) {
      if (!this.previewContainer) return;
      const url = link.href;
      if (this.currentPreviewUrl === url) return;
      this.currentPreviewUrl = url;
      const posX = Math.min(x + 10, window.innerWidth - 420);
      const posY = Math.min(y + 10, window.innerHeight - 320);
      this.previewContainer.style.left = `${posX}px`;
      this.previewContainer.style.top = `${posY}px`;
      this.previewContainer.style.display = "block";
      const content = this.previewContainer.querySelector(".preview-content");
      if (content) {
        content.innerHTML = '<div class="preview-loader">加载中...</div>';
      }
      try {
        const previewData = await this.fetchPreviewData(url);
        this.renderPreview(previewData);
      } catch (error) {
        console.warn("[链接管理] 预览加载失败:", error);
        this.renderPreviewError();
      }
    }
    hidePreview() {
      if (this.previewContainer) {
        this.previewContainer.style.display = "none";
        this.currentPreviewUrl = null;
      }
    }
    async fetchPreviewData(url) {
      const apiUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
      const response = await fetch(apiUrl, {
        headers: {
          "Accept": "application/json"
        }
      });
      if (!response.ok) {
        throw new Error("预览服务不可用");
      }
      return await response.json();
    }
    renderPreview(data) {
      if (!this.previewContainer) return;
      const content = this.previewContainer.querySelector(".preview-content");
      if (content) {
        content.innerHTML = `
        <div style="padding: 16px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">
            ${data.title || "无标题"}
          </h3>
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #666; line-height: 1.4;">
            ${data.description || "无描述"}
          </p>
          <div style="font-size: 12px; color: #999;">
            ${data.url || this.currentPreviewUrl}
          </div>
        </div>
      `;
      }
    }
    renderPreviewError() {
      if (!this.previewContainer) return;
      const content = this.previewContainer.querySelector(".preview-content");
      if (content) {
        content.innerHTML = `
        <div style="padding: 16px; text-align: center; color: #999;">
          <div>预览不可用</div>
          <div style="font-size: 12px; margin-top: 8px;">
            ${this.currentPreviewUrl}
          </div>
        </div>
      `;
      }
    }
    cleanupLink(link) {
      if (link.hasAttribute("data-original-target")) {
        link.setAttribute("target", link.getAttribute("data-original-target"));
        link.removeAttribute("data-original-target");
      } else {
        link.removeAttribute("target");
      }
      if (link.hasAttribute("data-original-rel")) {
        link.setAttribute("rel", link.getAttribute("data-original-rel"));
        link.removeAttribute("data-original-rel");
      } else {
        link.removeAttribute("rel");
      }
      link.classList.remove("yuanqi-external-link", "yuanqi-internal-link");
      link.querySelector(".yuanqi-external-icon")?.remove();
      link.querySelector(".yuanqi-preview-icon")?.remove();
      link.removeAttribute("data-custom-rule");
    }
    startMutationObserver() {
      this.mutationObserver = new MutationObserver((mutations) => {
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(() => {
            this.processMutations(mutations);
          });
        } else {
          setTimeout(() => {
            this.processMutations(mutations);
          }, 0);
        }
      });
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    processMutations(mutations) {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              if (element.tagName === "A" && element.href) {
                this.processLink(element);
              } else {
                const links = element.querySelectorAll("a[href]");
                links.forEach((link) => this.processLink(link));
              }
            }
          });
        }
      });
    }
    getLinkStats() {
      const allLinks = document.querySelectorAll("a[href]");
      const externalLinks = document.querySelectorAll(".yuanqi-external-link");
      const internalLinks = document.querySelectorAll(".yuanqi-internal-link");
      return {
        total: allLinks.length,
        external: externalLinks.length,
        internal: internalLinks.length,
        processed: this.processedLinks.size
      };
    }
    updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings };
      this.reprocessAllLinks();
      if (this.settings.popupPreview && !this.previewContainer) {
        this.createPreviewContainer();
      } else if (!this.settings.popupPreview && this.previewContainer) {
        this.removePreviewContainer();
      }
    }
    destroy() {
      this.processedLinks.forEach((link) => {
        this.cleanupLink(link);
      });
      this.processedLinks.clear();
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }
      this.removePreviewContainer();
      chrome.runtime.onMessage.removeListener(this.handleMessage.bind(this));
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", async () => {
      const result = await chrome.storage.sync.get(["websiteToolsSettings"]);
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
    chrome.storage.sync.get(["websiteToolsSettings"]).then((result) => {
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
  exports.LinkRewriterModule = LinkRewriterModule;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  return exports;
}({});
