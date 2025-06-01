/**
 * 媒体提取模块
 * 用于提取页面中的图片、视频、音频等媒体资源
 */

interface MediaItem {
  type: 'image' | 'video' | 'audio';
  url: string;
  title?: string;
  size?: string;
  dimensions?: { width: number; height: number };
}

class MediaExtractor {
  private logger = {
    log: (message: string, ...args: any[]) => console.log(`[媒体提取] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[媒体提取] ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[媒体提取] ${message}`, ...args)
  };

  constructor() {
    this.init();
  }

  private init() {
    this.logger.log('媒体提取模块初始化');
    this.setupMessageListener();
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'EXTRACT_IMAGES') {
        this.extractImages().then(sendResponse);
        return true;
      } else if (message.type === 'EXTRACT_VIDEOS') {
        this.extractVideos().then(sendResponse);
        return true;
      } else if (message.type === 'EXTRACT_AUDIO') {
        this.extractAudio().then(sendResponse);
        return true;
      }
    });
  }

  async extractImages(): Promise<MediaItem[]> {
    const images: MediaItem[] = [];
    
    // 提取img标签
    const imgElements = document.querySelectorAll('img');
    imgElements.forEach(img => {
      if (img.src && !img.src.startsWith('data:')) {
        images.push({
          type: 'image',
          url: img.src,
          title: img.alt || img.title || '未命名图片',
          dimensions: { width: img.naturalWidth, height: img.naturalHeight }
        });
      }
    });

    this.logger.log(`提取到 ${images.length} 张图片`);
    return images;
  }

  async extractVideos(): Promise<MediaItem[]> {
    const videos: MediaItem[] = [];
    
    // 提取video标签
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
      if (video.src) {
        videos.push({
          type: 'video',
          url: video.src,
          title: video.title || '未命名视频'
        });
      }
    });

    this.logger.log(`提取到 ${videos.length} 个视频`);
    return videos;
  }

  async extractAudio(): Promise<MediaItem[]> {
    const audios: MediaItem[] = [];
    
    // 提取audio标签
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      if (audio.src) {
        audios.push({
          type: 'audio',
          url: audio.src,
          title: audio.title || '未命名音频'
        });
      }
    });

    this.logger.log(`提取到 ${audios.length} 个音频`);
    return audios;
  }
}

// 初始化媒体提取器
new MediaExtractor(); 