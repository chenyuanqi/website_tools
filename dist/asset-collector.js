(function() {
  "use strict";
  class MediaExtractor {
    constructor() {
      this.logger = {
        log: (message, ...args) => console.log(`[媒体提取] ${message}`, ...args),
        warn: (message, ...args) => console.warn(`[媒体提取] ${message}`, ...args),
        error: (message, ...args) => console.error(`[媒体提取] ${message}`, ...args)
      };
      this.init();
    }
    init() {
      this.logger.log("媒体提取模块初始化");
      this.setupMessageListener();
    }
    setupMessageListener() {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "EXTRACT_IMAGES") {
          this.extractImages().then(sendResponse);
          return true;
        } else if (message.type === "EXTRACT_VIDEOS") {
          this.extractVideos().then(sendResponse);
          return true;
        } else if (message.type === "EXTRACT_AUDIO") {
          this.extractAudio().then(sendResponse);
          return true;
        }
      });
    }
    async extractImages() {
      const images = [];
      const imgElements = document.querySelectorAll("img");
      imgElements.forEach((img) => {
        if (img.src && !img.src.startsWith("data:")) {
          images.push({
            type: "image",
            url: img.src,
            title: img.alt || img.title || "未命名图片",
            dimensions: { width: img.naturalWidth, height: img.naturalHeight }
          });
        }
      });
      this.logger.log(`提取到 ${images.length} 张图片`);
      return images;
    }
    async extractVideos() {
      const videos = [];
      const videoElements = document.querySelectorAll("video");
      videoElements.forEach((video) => {
        if (video.src) {
          videos.push({
            type: "video",
            url: video.src,
            title: video.title || "未命名视频"
          });
        }
      });
      this.logger.log(`提取到 ${videos.length} 个视频`);
      return videos;
    }
    async extractAudio() {
      const audios = [];
      const audioElements = document.querySelectorAll("audio");
      audioElements.forEach((audio) => {
        if (audio.src) {
          audios.push({
            type: "audio",
            url: audio.src,
            title: audio.title || "未命名音频"
          });
        }
      });
      this.logger.log(`提取到 ${audios.length} 个音频`);
      return audios;
    }
  }
  new MediaExtractor();
})();
