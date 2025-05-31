# 元气助手 - 现代化Chrome扩展

> 聚合日常网页浏览中最常用的实用工具：链接管理、复制限制解除、媒体文件提取等功能

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/your-repo/yuanqi-assistant)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0+-purple.svg)](https://vitejs.dev/)

## ✨ 功能特色

### 🆓 复制自由 - SuperCopy风格强力解锁

**基于SuperCopy核心技术的四层解锁机制：**

- **CSS层禁制** - 硬覆盖所有`user-select: none`、`pointer-events: none`等样式
- **JS层禁制(显式)** - 扫描并移除内联事件处理器(`onselectstart`、`ondragstart`等)
- **clone&replace技巧** - 克隆整个DOM树清空所有`addEventListener`注册的监听器
- **动态事件拦截** - Monkey-patch `EventTarget.prototype.addEventListener`拦截新的禁用事件

**智能白名单管理：**
- 🎯 **一键启用** - 点击扩展图标即可启用/禁用当前网站
- 📋 **自动记忆** - 自动记住已启用的网站域名
- 🔄 **状态同步** - 实时更新扩展图标状态(灰色=未启用，绿色=已启用)
- ⚡ **强力模式** - 终极兜底方案，使用`contentEditable`强制解锁

**特殊网站支持：**
- 飞书、知乎、简书等网站的定制处理
- 应对`cursor: none`等特殊限制手段
- 智能检测和修复各种复制阻止技术

### 🔗 链接管理
- **新标签页打开** - 外部链接自动在新标签页打开
- **链接预览** - 悬停显示链接内容预览
- **安全增强** - 自动添加noopener/noreferrer属性
- **自定义规则** - 支持域名级别的自定义配置

### 🎬 媒体提取
- **图片提取** - 智能提取页面所有图片（包括CSS背景图）
- **视频检测** - 检测页面视频资源（支持HLS、DASH流媒体）
- **音频收集** - 收集页面音频文件
- **懒加载处理** - 自动触发懒加载图片
- **第三方平台** - 支持YouTube、Bilibili等平台

## 🏗️ 技术架构

### 现代化技术栈
- **构建工具**: Vite 5.0+ 
- **开发语言**: TypeScript 5.0+
- **代码质量**: ESLint + Prettier
- **扩展标准**: Manifest V3

### 模块化设计
```
📦 元气助手
├── 🌐 Background Service Worker    # 事件驱动、状态管理、白名单管理
├── 📄 Content Scripts (模块化)
│   ├── selection-unlock.ts        # SuperCopy风格复制自由模块
│   ├── link-rewriter.ts          # 链接管理模块
│   └── asset-collector.ts        # 媒体提取模块
├── 🎨 用户界面
│   ├── popup                     # 快速操作面板
│   ├── sidepanel                 # 详细功能面板
│   └── options                   # 设置管理页面(含白名单管理)
└── 🔧 共享模块
    ├── messaging.ts              # 统一消息通信
    ├── storage.ts                # 数据存储管理
    └── utils.ts                  # 工具函数库
```

## 🚀 快速开始

### 开发环境准备
```bash
# 克隆项目
git clone https://github.com/your-repo/yuanqi-assistant.git
cd yuanqi-assistant

# 安装依赖
npm install

# 开发模式（支持热重载）
npm run dev

# 构建生产版本
npm run build

# 类型检查
npm run type-check

# 代码格式化
npm run format
```

### 安装扩展
1. 打开Chrome浏览器，进入 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目的 `dist` 目录

## 📖 使用指南

### 复制自由功能 - SuperCopy风格操作

#### 基础使用
1. **一键启用**: 点击浏览器工具栏中的元气助手图标
   - 灰色图标 = 未启用
   - 绿色✓图标 = 已启用
2. **自动记忆**: 启用后会自动添加到白名单，下次访问自动生效
3. **批量管理**: 在设置页面管理所有白名单网站

#### 高级功能
1. **强力模式**: 右键菜单选择"强力模式 (终极解锁)"
2. **白名单管理**: 设置页面可查看、删除、清空白名单
3. **状态监控**: 实时显示当前网站的解锁状态

#### 技术原理
```typescript
// 1. CSS层硬覆盖
* {
  user-select: text !important;
  -webkit-user-select: text !important;
  pointer-events: auto !important;
}

// 2. 移除内联事件
element.removeAttribute('onselectstart');
element.removeAttribute('ondragstart');

// 3. clone&replace清空监听器
const html = document.documentElement;
html.replaceWith(html.cloneNode(true));

// 4. 拦截新的事件注册
EventTarget.prototype.addEventListener = function(type, listener, options) {
  if (violentEvents.includes(type)) {
    return originalAddEventListener.call(this, type, interceptor, options);
  }
  return originalAddEventListener.call(this, type, listener, options);
};
```

### 链接管理功能
1. **新标签页打开**: 外部链接自动在新标签页打开
2. **链接预览**: 悬停在链接上查看内容预览
3. **自定义规则**: 在设置页面配置特定域名的处理方式

### 媒体提取功能
1. **图片提取**: 右键菜单选择"提取页面图片"或点击扩展图标
2. **视频检测**: 自动检测页面视频，在侧边栏显示结果
3. **批量下载**: 在侧边栏中选择要下载的媒体文件

## ⚙️ 配置选项

### 复制自由设置
- `enabled`: 启用复制自由功能
- `whitelist`: 自动解锁的网站白名单
- `violentMode`: 强力模式开关

### 链接管理设置
- `newTabForExternal`: 外部链接新标签页打开
- `popupPreview`: 启用链接预览
- `customRules`: 自定义域名规则

### 媒体提取设置
- `autoDetectImages`: 自动检测图片
- `autoDetectVideos`: 自动检测视频
- `minImageSize`: 最小图片尺寸过滤
- `supportedFormats`: 支持的文件格式

## 🔧 开发指南

### 项目结构
```
src/
├── background/           # Background Service Worker
├── content/             # Content Scripts模块
│   ├── selection-unlock.ts  # SuperCopy风格复制自由
│   ├── link-rewriter.ts     # 链接管理
│   └── asset-collector.ts   # 媒体提取
├── shared/              # 共享工具模块
├── popup/               # 弹出窗口界面
├── sidepanel/           # 侧边栏界面
├── options/             # 设置页面(含白名单管理)
└── manifest.json        # 扩展清单文件
```

### 添加新功能
1. 在 `src/content/` 创建新的功能模块
2. 在 `src/shared/messaging.ts` 添加消息类型
3. 在 `src/background/index.ts` 注册消息处理器
4. 更新用户界面以支持新功能

### 消息通信
```typescript
// 发送消息给background
import { sendToBg, MessageTypes } from '@shared/messaging';

const response = await sendToBg({
  type: MessageTypes.ENABLE_TEXT_SELECTION,
  data: { url: window.location.href }
});
```

## 🧪 测试

### 功能测试
使用提供的测试页面验证功能：
```bash
# 打开测试页面
open test-supercopy.html
```

测试页面包含：
- CSS禁用选择测试
- JavaScript事件阻止测试
- 指针事件禁用测试
- 光标隐藏测试
- 拖拽禁用测试

### 运行测试
```bash
# 单元测试
npm run test

# 集成测试
npm run test:integration

# 端到端测试
npm run test:e2e
```

### 测试覆盖率
- 核心功能模块 > 90%
- 消息通信系统 > 95%
- 用户界面组件 > 80%

## 📈 性能优化

### 加载性能
- **模块懒加载**: 按需加载功能模块
- **代码分割**: Vite自动代码分割
- **资源压缩**: 生产环境自动压缩

### 运行性能
- **事件节流**: 使用requestIdleCallback
- **内存管理**: 及时清理不用的资源
- **缓存策略**: 智能缓存常用数据

### 网络优化
- **请求合并**: 批量处理网络请求
- **超时控制**: 合理的超时时间设置
- **错误重试**: 智能重试机制

## 🔒 安全特性

### 内容安全策略
- 严格的CSP策略防止XSS攻击
- 禁用内联脚本和样式
- 限制外部资源加载

### 权限管理
- 最小权限原则
- 动态权限请求
- 透明的权限说明

### 数据保护
- 本地存储加密
- 敏感数据脱敏
- 安全的跨域处理

## 🆚 与SuperCopy对比

| 特性 | 元气助手 | SuperCopy |
|------|----------|-----------|
| **核心技术** | 四层解锁机制 | 四层解锁机制 |
| **白名单管理** | ✅ 可视化管理界面 | ✅ 基础管理 |
| **强力模式** | ✅ 右键菜单快速启用 | ❌ 无 |
| **状态指示** | ✅ 实时图标状态 | ✅ 图标状态 |
| **开源** | ✅ 完全开源 | ❌ 闭源 |
| **功能扩展** | ✅ 链接管理+媒体提取 | ❌ 仅复制功能 |
| **现代化** | ✅ TypeScript + Vite | ❌ 传统开发 |
| **体积** | ~200KB | ~182KB |

## 🤝 贡献指南

### 开发流程
1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范
- 使用TypeScript进行类型安全开发
- 遵循ESLint和Prettier配置
- 编写单元测试覆盖新功能
- 更新相关文档

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [SuperCopy](https://chrome.google.com/webstore/detail/supercopy-enable-copy/onepmapfbjohnegdmfhndpefjkppbjkm) - 核心技术灵感来源
- [Vite](https://vitejs.dev/) - 快速的构建工具
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的JavaScript
- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/) - 强大的扩展API

## 📞 支持

如果你遇到问题或有建议，请：
- 查看 [常见问题](docs/FAQ.md)
- 提交 [Issue](https://github.com/your-repo/yuanqi-assistant/issues)
- 参考 [架构重构指南](docs/架构重构指南.md)

---

**元气助手** - 让网页浏览更自由、更高效！ 🚀 

> 基于SuperCopy核心技术，提供更强大的复制自由体验 