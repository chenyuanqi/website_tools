/**
 * 媒体提取功能测试
 */

import { createMockElement } from '../setup';

// 创建模拟图片元素
const createMockImage = (src: string, attributes: Record<string, any> = {}) => {
  const element = createMockElement('img');
  element.src = src;
  element.alt = attributes.alt || '';
  element.width = attributes.width || 100;
  element.height = attributes.height || 100;
  element.dataset = attributes.dataset || {};
  return element;
};

// 创建模拟视频元素
const createMockVideo = (src: string, attributes: Record<string, any> = {}) => {
  const element = createMockElement('video');
  element.src = src;
  element.title = attributes.title || '';
  element.width = attributes.width || 640;
  element.height = attributes.height || 480;
  // 模拟duration属性
  Object.defineProperty(element, 'duration', {
    value: attributes.duration || 0,
    writable: true
  });
  return element;
};

// 创建模拟音频元素
const createMockAudio = (src: string, attributes: Record<string, any> = {}) => {
  const element = createMockElement('audio');
  element.src = src;
  element.title = attributes.title || '';
  // 模拟duration属性
  Object.defineProperty(element, 'duration', {
    value: attributes.duration || 0,
    writable: true
  });
  return element;
};

// 模拟媒体提取函数
const extractImagesFromPage = () => {
  const images: any[] = [];
  let index = 0;

  // 提取img标签
  const imgElements = document.querySelectorAll('img') as any[];
  imgElements.forEach(img => {
    let src = img.src;
    
    // 处理懒加载
    if (!src && img.dataset) {
      src = img.dataset.src || img.dataset.original || '';
    }
    
    if (src && !src.startsWith('data:')) {
      images.push({
        type: 'image',
        src,
        alt: img.alt || '',
        width: img.width || 0,
        height: img.height || 0,
        size: 0,
        index: index++
      });
    }
  });

  // 提取CSS背景图片
  const allElements = document.querySelectorAll('*') as any[];
  allElements.forEach(element => {
    const style = window.getComputedStyle(element);
    const bgImage = style.backgroundImage;
    
    if (bgImage && bgImage !== 'none') {
      const urls = bgImage.match(/url\(["']?([^"')]+)["']?\)/g);
      if (urls) {
        urls.forEach(urlMatch => {
          const src = urlMatch.replace(/url\(["']?([^"')]+)["']?\)/, '$1');
          if (!src.startsWith('data:')) {
            images.push({
              type: 'background',
              src,
              alt: 'Background Image',
              width: 0,
              height: 0,
              size: 0,
              index: index++
            });
          }
        });
      }
    }
  });

  // 去重
  const uniqueImages = images.filter((img, idx, arr) => 
    arr.findIndex(item => item.src === img.src) === idx
  );

  return uniqueImages;
};

const extractVideosFromPage = () => {
  const videos: any[] = [];
  const videoElements = document.querySelectorAll('video') as any[];
  
  videoElements.forEach((video, index) => {
    if (video.src) {
      videos.push({
        type: 'video',
        src: video.src,
        title: video.title || '',
        duration: video.duration || 0,
        width: video.width || 640,
        height: video.height || 480,
        size: 0,
        index
      });
    }
  });

  return videos;
};

const extractAudioFromPage = () => {
  const audios: any[] = [];
  const audioElements = document.querySelectorAll('audio') as any[];
  
  audioElements.forEach((audio, index) => {
    if (audio.src) {
      audios.push({
        type: 'audio',
        src: audio.src,
        title: audio.title || '',
        duration: audio.duration || 0,
        size: 0,
        index
      });
    }
  });

  return audios;
};

describe('媒体提取功能', () => {
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
  });

  describe('图片提取', () => {
    test('应该提取img标签中的图片', () => {
      const mockImages = [
        createMockImage('https://example.com/image1.jpg', { alt: 'Image 1' }),
        createMockImage('https://example.com/image2.png', { alt: 'Image 2' })
      ];
      
      (document.querySelectorAll as jest.Mock).mockImplementation((selector) => {
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
      
      (document.querySelectorAll as jest.Mock).mockImplementation((selector) => {
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
        createMockElement('div'),
        createMockElement('section')
      ];
      
      (document.querySelectorAll as jest.Mock).mockImplementation((selector) => {
        if (selector === 'img') return [];
        if (selector === '*') return mockElements;
        return [];
      });

      // 为每个元素返回不同的背景图片，避免去重
      (window.getComputedStyle as jest.Mock).mockImplementation((element) => {
        if (element === mockElements[0]) {
          return {
            backgroundImage: 'url("https://example.com/bg1.jpg"), url(https://example.com/bg2.png)'
          };
        } else if (element === mockElements[1]) {
          return {
            backgroundImage: 'url("https://example.com/bg3.jpg"), url(https://example.com/bg4.png)'
          };
        }
        return { backgroundImage: 'none' };
      });

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
      
      (document.querySelectorAll as jest.Mock).mockImplementation((selector) => {
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
      const mockElements = [createMockElement('div')];
      
      (document.querySelectorAll as jest.Mock).mockImplementation((selector) => {
        if (selector === 'img') return [];
        if (selector === '*') return mockElements;
        return [];
      });

      (window.getComputedStyle as jest.Mock).mockImplementation(() => ({
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
      
      (document.querySelectorAll as jest.Mock).mockImplementation((selector) => {
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

    test('应该忽略没有src的视频', () => {
      const mockVideos = [
        createMockVideo('', { title: 'Empty Video' }),
        createMockVideo('https://example.com/video.mp4', { title: 'Valid Video' })
      ];
      
      (document.querySelectorAll as jest.Mock).mockImplementation((selector) => {
        if (selector === 'video') return mockVideos;
        return [];
      });

      const result = extractVideosFromPage();

      expect(result).toHaveLength(1);
      expect(result[0].src).toBe('https://example.com/video.mp4');
    });
  });

  describe('音频提取', () => {
    test('应该提取audio标签中的音频', () => {
      const mockAudios = [
        createMockAudio('https://example.com/audio1.mp3', { 
          title: 'Audio 1',
          duration: 180
        }),
        createMockAudio('https://example.com/audio2.wav', { 
          title: 'Audio 2',
          duration: 240
        })
      ];
      
      (document.querySelectorAll as jest.Mock).mockImplementation((selector) => {
        if (selector === 'audio') return mockAudios;
        return [];
      });

      const result = extractAudioFromPage();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'audio',
        src: 'https://example.com/audio1.mp3',
        title: 'Audio 1',
        duration: 180,
        size: 0,
        index: 0
      });
    });
  });

  describe('性能测试', () => {
    test('应该高效处理大量媒体元素', () => {
      // 创建大量模拟元素
      const mockImages = Array.from({ length: 100 }, (_, i) => 
        createMockImage(`https://example.com/image${i}.jpg`)
      );
      
      (document.querySelectorAll as jest.Mock).mockImplementation((selector) => {
        if (selector === 'img') return mockImages;
        if (selector === '*') return [];
        return [];
      });

      const startTime = performance.now();
      const result = extractImagesFromPage();
      const endTime = performance.now();

      expect(result).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });
  });

  describe('数据格式验证', () => {
    test('图片数据应该包含所有必需字段', () => {
      const mockImages = [createMockImage('https://example.com/test.jpg')];
      
      (document.querySelectorAll as jest.Mock).mockImplementation((selector) => {
        if (selector === 'img') return mockImages;
        if (selector === '*') return [];
        return [];
      });

      const result = extractImagesFromPage();

      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('src');
      expect(result[0]).toHaveProperty('alt');
      expect(result[0]).toHaveProperty('width');
      expect(result[0]).toHaveProperty('height');
      expect(result[0]).toHaveProperty('size');
      expect(result[0]).toHaveProperty('index');
    });

    test('视频数据应该包含所有必需字段', () => {
      const mockVideos = [createMockVideo('https://example.com/test.mp4')];
      
      (document.querySelectorAll as jest.Mock).mockImplementation((selector) => {
        if (selector === 'video') return mockVideos;
        return [];
      });

      const result = extractVideosFromPage();

      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('src');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('duration');
      expect(result[0]).toHaveProperty('width');
      expect(result[0]).toHaveProperty('height');
      expect(result[0]).toHaveProperty('size');
      expect(result[0]).toHaveProperty('index');
    });

    test('音频数据应该包含所有必需字段', () => {
      const mockAudios = [createMockAudio('https://example.com/test.mp3')];
      
      (document.querySelectorAll as jest.Mock).mockImplementation((selector) => {
        if (selector === 'audio') return mockAudios;
        return [];
      });

      const result = extractAudioFromPage();

      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('src');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('duration');
      expect(result[0]).toHaveProperty('size');
      expect(result[0]).toHaveProperty('index');
    });
  });
}); 