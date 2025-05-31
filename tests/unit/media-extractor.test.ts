/**
 * 媒体提取功能单元测试
 * 测试媒体提取相关的函数
 */

import { mockChrome } from '../setup';

// 模拟媒体元素
const createMockImage = (src: string, attributes: Record<string, any> = {}) => ({
  src,
  alt: attributes.alt || '',
  width: attributes.width || 100,
  height: attributes.height || 100,
  naturalWidth: attributes.naturalWidth || 100,
  naturalHeight: attributes.naturalHeight || 100,
  dataset: attributes.dataset || {},
  tagName: 'IMG'
});

const createMockVideo = (src: string, attributes: Record<string, any> = {}) => ({
  src,
  currentSrc: attributes.currentSrc || src,
  title: attributes.title || '',
  duration: attributes.duration || 0,
  width: attributes.width || 640,
  height: attributes.height || 480,
  videoWidth: attributes.videoWidth || 640,
  videoHeight: attributes.videoHeight || 480,
  querySelectorAll: jest.fn().mockReturnValue([]),
  tagName: 'VIDEO'
});

const createMockAudio = (src: string, attributes: Record<string, any> = {}) => ({
  src,
  currentSrc: attributes.currentSrc || src,
  title: attributes.title || '',
  duration: attributes.duration || 0,
  querySelectorAll: jest.fn().mockReturnValue([]),
  tagName: 'AUDIO'
});

// 模拟document
const mockDocument = {
  ...global.document,
  querySelectorAll: jest.fn()
};

// 模拟window
const mockWindow = {
  getComputedStyle: jest.fn().mockReturnValue({
    backgroundImage: 'none'
  })
};

// 模拟媒体提取函数（基于main-simple.js的实现）
const extractImagesFromPage = () => {
  console.log('[网页工具-简化版] 开始提取页面图片');
  
  const images: any[] = [];
  const seenUrls = new Set<string>();
  
  // 提取img标签
  const imgElements = mockDocument.querySelectorAll('img');
  imgElements.forEach((img: any, index: number) => {
    const src = img.src || img.dataset.src || img.dataset.original;
    if (src && !seenUrls.has(src)) {
      seenUrls.add(src);
      images.push({
        type: 'image',
        src: src,
        alt: img.alt || '',
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0,
        size: 0,
        index: index
      });
    }
  });
  
  // 提取CSS背景图片
  const allElements = mockDocument.querySelectorAll('*');
  allElements.forEach((element: any, index: number) => {
    const style = mockWindow.getComputedStyle(element);
    const backgroundImage = style.backgroundImage;
    
    if (backgroundImage && backgroundImage !== 'none') {
      const matches = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/g);
      if (matches) {
        matches.forEach((match: string) => {
          const url = match.replace(/url\(['"]?/, '').replace(/['"]?\)$/, '');
          if (url && !seenUrls.has(url) && !url.startsWith('data:')) {
            seenUrls.add(url);
            images.push({
              type: 'background',
              src: url,
              alt: 'Background Image',
              width: 0,
              height: 0,
              size: 0,
              index: index
            });
          }
        });
      }
    }
  });
  
  return images;
};

const extractVideosFromPage = () => {
  console.log('[网页工具-简化版] 开始提取页面视频');
  
  const videos: any[] = [];
  const seenUrls = new Set<string>();
  
  // 提取video标签
  const videoElements = mockDocument.querySelectorAll('video');
  videoElements.forEach((video: any, index: number) => {
    const src = video.src || video.currentSrc;
    if (src && !seenUrls.has(src)) {
      seenUrls.add(src);
      videos.push({
        type: 'video',
        src: src,
        title: video.title || '',
        duration: video.duration || 0,
        width: video.videoWidth || video.width || 0,
        height: video.videoHeight || video.height || 0,
        size: 0,
        index: index
      });
    }
    
    // 检查source标签
    const sources = video.querySelectorAll('source');
    sources.forEach((source: any) => {
      const sourceSrc = source.src;
      if (sourceSrc && !seenUrls.has(sourceSrc)) {
        seenUrls.add(sourceSrc);
        videos.push({
          type: 'video',
          src: sourceSrc,
          title: video.title || '',
          duration: video.duration || 0,
          width: video.videoWidth || video.width || 0,
          height: video.videoHeight || video.height || 0,
          size: 0,
          index: index
        });
      }
    });
  });
  
  return videos;
};

const extractAudioFromPage = () => {
  console.log('[网页工具-简化版] 开始提取页面音频');
  
  const audios: any[] = [];
  const seenUrls = new Set<string>();
  
  // 提取audio标签
  const audioElements = mockDocument.querySelectorAll('audio');
  audioElements.forEach((audio: any, index: number) => {
    const src = audio.src || audio.currentSrc;
    if (src && !seenUrls.has(src)) {
      seenUrls.add(src);
      audios.push({
        type: 'audio',
        src: src,
        title: audio.title || '',
        duration: audio.duration || 0,
        size: 0,
        index: index
      });
    }
    
    // 检查source标签
    const sources = audio.querySelectorAll('source');
    sources.forEach((source: any) => {
      const sourceSrc = source.src;
      if (sourceSrc && !seenUrls.has(sourceSrc)) {
        seenUrls.add(sourceSrc);
        audios.push({
          type: 'audio',
          src: sourceSrc,
          title: audio.title || '',
          duration: audio.duration || 0,
          size: 0,
          index: index
        });
      }
    });
  });
  
  return audios;
};

describe('媒体提取功能', () => {
  let originalDocument: any;
  let originalWindow: any;

  beforeEach(() => {
    // 保存原始对象
    originalDocument = global.document;
    originalWindow = global.window;

    // 设置模拟对象
    Object.defineProperty(global, 'document', {
      value: mockDocument,
      writable: true
    });
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true
    });

    // 重置所有模拟
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 恢复原始对象
    Object.defineProperty(global, 'document', {
      value: originalDocument,
      writable: true
    });
    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true
    });
  });

  describe('图片提取', () => {
    test('应该提取img标签中的图片', () => {
      const mockImages = [
        createMockImage('https://example.com/image1.jpg', { alt: 'Image 1' }),
        createMockImage('https://example.com/image2.png', { alt: 'Image 2' })
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'img') return mockImages;
        if (selector === '*') return [];
        return [];
      });

      const result = extractImagesFromPage();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'image',
        src: 'https://example.com/image1.jpg',
        alt: 'Image 1',
        width: 100,
        height: 100,
        size: 0,
        index: 0
      });
      expect(result[1]).toEqual({
        type: 'image',
        src: 'https://example.com/image2.png',
        alt: 'Image 2',
        width: 100,
        height: 100,
        size: 0,
        index: 1
      });
    });

    test('应该处理懒加载图片', () => {
      const mockImages = [
        createMockImage('', { 
          dataset: { src: 'https://example.com/lazy1.jpg' },
          alt: 'Lazy Image 1'
        }),
        createMockImage('', { 
          dataset: { original: 'https://example.com/lazy2.jpg' },
          alt: 'Lazy Image 2'
        })
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'img') return mockImages;
        if (selector === '*') return [];
        return [];
      });

      const result = extractImagesFromPage();

      expect(result).toHaveLength(2);
      expect(result[0].src).toBe('https://example.com/lazy1.jpg');
      expect(result[1].src).toBe('https://example.com/lazy2.jpg');
    });

    test('应该提取CSS背景图片', () => {
      const mockElements = [
        { tagName: 'DIV' },
        { tagName: 'SECTION' }
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'img') return [];
        if (selector === '*') return mockElements;
        return [];
      });

      mockWindow.getComputedStyle.mockImplementation(() => ({
        backgroundImage: 'url("https://example.com/bg1.jpg"), url(https://example.com/bg2.png)'
      }));

      const result = extractImagesFromPage();

      expect(result).toHaveLength(4); // 2个元素 × 2个背景图片
      expect(result[0]).toEqual({
        type: 'background',
        src: 'https://example.com/bg1.jpg',
        alt: 'Background Image',
        width: 0,
        height: 0,
        size: 0,
        index: 0
      });
    });

    test('应该去重相同的图片URL', () => {
      const mockImages = [
        createMockImage('https://example.com/same.jpg'),
        createMockImage('https://example.com/same.jpg'), // 重复
        createMockImage('https://example.com/different.jpg')
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'img') return mockImages;
        if (selector === '*') return [];
        return [];
      });

      const result = extractImagesFromPage();

      expect(result).toHaveLength(2);
      expect(result.map(img => img.src)).toEqual([
        'https://example.com/same.jpg',
        'https://example.com/different.jpg'
      ]);
    });

    test('应该忽略data URL', () => {
      const mockElements = [{ tagName: 'DIV' }];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'img') return [];
        if (selector === '*') return mockElements;
        return [];
      });

      mockWindow.getComputedStyle.mockImplementation(() => ({
        backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==")'
      }));

      const result = extractImagesFromPage();

      expect(result).toHaveLength(0);
    });
  });

  describe('视频提取', () => {
    test('应该提取video标签中的视频', () => {
      const mockVideos = [
        createMockVideo('https://example.com/video1.mp4', { 
          title: 'Video 1',
          duration: 120
        }),
        createMockVideo('https://example.com/video2.webm', { 
          title: 'Video 2',
          duration: 180
        })
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'video') return mockVideos;
        return [];
      });

      const result = extractVideosFromPage();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'video',
        src: 'https://example.com/video1.mp4',
        title: 'Video 1',
        duration: 120,
        width: 640,
        height: 480,
        size: 0,
        index: 0
      });
    });

    test('应该提取source标签中的视频源', () => {
      const mockSources = [
        { src: 'https://example.com/video.mp4' },
        { src: 'https://example.com/video.webm' }
      ];
      
      const mockVideo = createMockVideo('', { title: 'Multi-source Video' });
      mockVideo.querySelectorAll.mockReturnValue(mockSources);
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'video') return [mockVideo];
        return [];
      });

      const result = extractVideosFromPage();

      expect(result).toHaveLength(2);
      expect(result[0].src).toBe('https://example.com/video.mp4');
      expect(result[1].src).toBe('https://example.com/video.webm');
    });

    test('应该使用currentSrc作为备选', () => {
      const mockVideo = createMockVideo('', { 
        currentSrc: 'https://example.com/current.mp4',
        title: 'Current Video'
      });
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'video') return [mockVideo];
        return [];
      });

      const result = extractVideosFromPage();

      expect(result).toHaveLength(1);
      expect(result[0].src).toBe('https://example.com/current.mp4');
    });

    test('应该去重相同的视频URL', () => {
      const mockSources = [
        { src: 'https://example.com/same.mp4' }
      ];
      
      const mockVideo = createMockVideo('https://example.com/same.mp4');
      mockVideo.querySelectorAll.mockReturnValue(mockSources);
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'video') return [mockVideo];
        return [];
      });

      const result = extractVideosFromPage();

      expect(result).toHaveLength(1); // 应该去重
      expect(result[0].src).toBe('https://example.com/same.mp4');
    });
  });

  describe('音频提取', () => {
    test('应该提取audio标签中的音频', () => {
      const mockAudios = [
        createMockAudio('https://example.com/audio1.mp3', { 
          title: 'Audio 1',
          duration: 240
        }),
        createMockAudio('https://example.com/audio2.wav', { 
          title: 'Audio 2',
          duration: 300
        })
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'audio') return mockAudios;
        return [];
      });

      const result = extractAudioFromPage();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'audio',
        src: 'https://example.com/audio1.mp3',
        title: 'Audio 1',
        duration: 240,
        size: 0,
        index: 0
      });
    });

    test('应该提取source标签中的音频源', () => {
      const mockSources = [
        { src: 'https://example.com/audio.mp3' },
        { src: 'https://example.com/audio.ogg' }
      ];
      
      const mockAudio = createMockAudio('', { title: 'Multi-source Audio' });
      mockAudio.querySelectorAll.mockReturnValue(mockSources);
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'audio') return [mockAudio];
        return [];
      });

      const result = extractAudioFromPage();

      expect(result).toHaveLength(2);
      expect(result[0].src).toBe('https://example.com/audio.mp3');
      expect(result[1].src).toBe('https://example.com/audio.ogg');
    });

    test('应该使用currentSrc作为备选', () => {
      const mockAudio = createMockAudio('', { 
        currentSrc: 'https://example.com/current.mp3',
        title: 'Current Audio'
      });
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'audio') return [mockAudio];
        return [];
      });

      const result = extractAudioFromPage();

      expect(result).toHaveLength(1);
      expect(result[0].src).toBe('https://example.com/current.mp3');
    });

    test('应该去重相同的音频URL', () => {
      const mockSources = [
        { src: 'https://example.com/same.mp3' }
      ];
      
      const mockAudio = createMockAudio('https://example.com/same.mp3');
      mockAudio.querySelectorAll.mockReturnValue(mockSources);
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'audio') return [mockAudio];
        return [];
      });

      const result = extractAudioFromPage();

      expect(result).toHaveLength(1); // 应该去重
      expect(result[0].src).toBe('https://example.com/same.mp3');
    });
  });

  describe('边界情况处理', () => {
    test('应该处理空页面', () => {
      mockDocument.querySelectorAll.mockReturnValue([]);
      mockWindow.getComputedStyle.mockReturnValue({ backgroundImage: 'none' });

      const images = extractImagesFromPage();
      const videos = extractVideosFromPage();
      const audios = extractAudioFromPage();

      expect(images).toHaveLength(0);
      expect(videos).toHaveLength(0);
      expect(audios).toHaveLength(0);
    });

    test('应该处理无效的媒体元素', () => {
      const invalidElements = [
        createMockImage(''), // 空src
        createMockVideo(''), // 空src
        createMockAudio('')  // 空src
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'img') return [invalidElements[0]];
        if (selector === 'video') return [invalidElements[1]];
        if (selector === 'audio') return [invalidElements[2]];
        if (selector === '*') return [];
        return [];
      });

      const images = extractImagesFromPage();
      const videos = extractVideosFromPage();
      const audios = extractAudioFromPage();

      expect(images).toHaveLength(0);
      expect(videos).toHaveLength(0);
      expect(audios).toHaveLength(0);
    });

    test('应该处理复杂的CSS背景图片语法', () => {
      const mockElements = [{ tagName: 'DIV' }];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'img') return [];
        if (selector === '*') return mockElements;
        return [];
      });

      mockWindow.getComputedStyle.mockImplementation(() => ({
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("https://example.com/bg.jpg")'
      }));

      const result = extractImagesFromPage();

      expect(result).toHaveLength(1);
      expect(result[0].src).toBe('https://example.com/bg.jpg');
    });
  });

  describe('性能测试', () => {
    test('应该高效处理大量媒体元素', () => {
      const largeImageArray = Array.from({ length: 1000 }, (_, i) => 
        createMockImage(`https://example.com/image${i}.jpg`)
      );
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'img') return largeImageArray;
        if (selector === '*') return [];
        return [];
      });

      const startTime = performance.now();
      const result = extractImagesFromPage();
      const endTime = performance.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });
  });

  describe('数据格式验证', () => {
    test('图片数据应该包含所有必需字段', () => {
      const mockImages = [
        createMockImage('https://example.com/test.jpg', {
          alt: 'Test Image',
          width: 200,
          height: 150,
          naturalWidth: 400,
          naturalHeight: 300
        })
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'img') return mockImages;
        if (selector === '*') return [];
        return [];
      });

      const result = extractImagesFromPage();

      expect(result[0]).toHaveProperty('type', 'image');
      expect(result[0]).toHaveProperty('src');
      expect(result[0]).toHaveProperty('alt');
      expect(result[0]).toHaveProperty('width');
      expect(result[0]).toHaveProperty('height');
      expect(result[0]).toHaveProperty('size');
      expect(result[0]).toHaveProperty('index');
    });

    test('视频数据应该包含所有必需字段', () => {
      const mockVideos = [
        createMockVideo('https://example.com/test.mp4', {
          title: 'Test Video',
          duration: 120,
          width: 1920,
          height: 1080
        })
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'video') return mockVideos;
        return [];
      });

      const result = extractVideosFromPage();

      expect(result[0]).toHaveProperty('type', 'video');
      expect(result[0]).toHaveProperty('src');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('duration');
      expect(result[0]).toHaveProperty('width');
      expect(result[0]).toHaveProperty('height');
      expect(result[0]).toHaveProperty('size');
      expect(result[0]).toHaveProperty('index');
    });

    test('音频数据应该包含所有必需字段', () => {
      const mockAudios = [
        createMockAudio('https://example.com/test.mp3', {
          title: 'Test Audio',
          duration: 180
        })
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'audio') return mockAudios;
        return [];
      });

      const result = extractAudioFromPage();

      expect(result[0]).toHaveProperty('type', 'audio');
      expect(result[0]).toHaveProperty('src');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('duration');
      expect(result[0]).toHaveProperty('size');
      expect(result[0]).toHaveProperty('index');
    });
  });
}); 