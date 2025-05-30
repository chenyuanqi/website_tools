# 网页工具插件开发指南

## 项目架构说明

### 目录结构详解

```
website_tools/
├── manifest.json              # Chrome扩展配置文件
├── package.json              # Node.js项目配置
├── README.md                 # 项目说明文档
├── src/                      # 源代码目录
│   ├── background/           # Service Worker后台脚本
│   │   ├── service-worker.js # 主要后台逻辑
│   │   └── utils.js         # 后台工具函数
│   ├── content/             # 内容脚本（注入到网页）
│   │   ├── main.js          # 主内容脚本入口
│   │   ├── link-manager.js  # 链接管理功能
│   │   ├── copy-freedom.js  # 复制限制解除
│   │   ├── media-extractor.js # 媒体提取功能
│   │   └── content.css      # 内容脚本样式
│   ├── popup/               # 弹出窗口
│   │   ├── popup.html       # 弹出窗口结构
│   │   ├── popup.js         # 弹出窗口逻辑
│   │   └── popup.css        # 弹出窗口样式
│   ├── sidepanel/           # 侧边栏面板
│   │   ├── sidepanel.html   # 侧边栏结构
│   │   ├── sidepanel.js     # 侧边栏逻辑
│   │   └── sidepanel.css    # 侧边栏样式
│   ├── options/             # 设置页面
│   │   ├── options.html     # 设置页面结构
│   │   ├── options.js       # 设置页面逻辑
│   │   └── options.css      # 设置页面样式
│   └── shared/              # 共享组件和工具
│       ├── storage.js       # 数据存储管理
│       ├── constants.js     # 常量定义
│       └── utils.js         # 通用工具函数
├── assets/                  # 静态资源
│   ├── icons/              # 扩展图标
│   └── images/             # 其他图片资源
└── docs/                   # 文档目录
    ├── api.md              # API文档
    ├── development.md      # 开发指南（本文件）
    └── user-guide.md       # 用户使用指南
```

## 开发环境设置

### 1. 安装扩展到Chrome
1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目根目录（包含manifest.json的文件夹）

### 2. 开发工具使用
- **Service Worker调试**: 在扩展管理页面点击"service worker"链接
- **Content Script调试**: 在网页中按F12，在Console中可以看到内容脚本的输出
- **Popup调试**: 右键点击扩展图标，选择"检查弹出式窗口"
- **Options页面调试**: 在扩展详情页面点击"扩展程序选项"

### 3. 实时开发
- 修改代码后，在扩展管理页面点击刷新按钮
- Content Scripts需要刷新网页才能生效
- Service Worker会自动重启

## 核心模块开发指南

### 1. Service Worker (后台脚本)
**文件**: `src/background/service-worker.js`

**主要职责**:
- 管理扩展的生命周期
- 处理右键菜单
- 管理侧边栏
- 处理跨标签页通信

**开发要点**:
```javascript
// Service Worker基本结构
chrome.runtime.onInstalled.addListener(() => {
  // 初始化设置
  console.log('扩展已安装');
});

// 处理来自Content Script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 消息处理逻辑
});
```

### 2. Content Scripts (内容脚本)
**文件**: `src/content/main.js` 及相关模块

**主要职责**:
- 与网页DOM交互
- 实现具体功能（链接管理、复制解除等）
- 向Service Worker发送消息

**开发要点**:
```javascript
// 等待DOM加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  // 初始化各个功能模块
}
```

### 3. 用户界面开发

#### Popup窗口
**文件**: `src/popup/popup.html`, `popup.js`, `popup.css`

**设计原则**:
- 简洁明了，快速访问
- 显示当前页面的功能状态
- 提供一键操作按钮

#### 侧边栏面板
**文件**: `src/sidepanel/sidepanel.html`, `sidepanel.js`, `sidepanel.css`

**设计原则**:
- 详细的功能控制
- 实时显示提取的媒体文件
- 支持批量操作

#### 设置页面
**文件**: `src/options/options.html`, `options.js`, `options.css`

**设计原则**:
- 完整的配置选项
- 导入/导出设置
- 帮助文档链接

## 代码规范

### 1. JavaScript规范
```javascript
// 使用ES6+语法
const functionName = () => {
  // 函数体
};

// 使用模块化
class ModuleName {
  constructor() {
    this.init();
  }
  
  init() {
    // 初始化逻辑
  }
}

// 错误处理
try {
  // 可能出错的代码
} catch (error) {
  console.error('错误信息:', error);
}
```

### 2. 注释规范
```javascript
/**
 * 函数功能描述
 * @param {string} param1 - 参数1描述
 * @param {Object} param2 - 参数2描述
 * @returns {boolean} 返回值描述
 */
function exampleFunction(param1, param2) {
  // 实现逻辑
}

// 单行注释用于解释复杂逻辑
const result = complexCalculation(); // 计算结果
```

### 3. CSS规范
```css
/* 使用BEM命名规范 */
.website-tools__container {
  /* 容器样式 */
}

.website-tools__button {
  /* 按钮基础样式 */
}

.website-tools__button--primary {
  /* 主要按钮样式 */
}

.website-tools__button--disabled {
  /* 禁用按钮样式 */
}
```

## 功能模块开发流程

### 1. 复制限制解除模块开发
**优先级**: 高
**预计时间**: 2-3天

**开发步骤**:
1. 创建 `src/content/copy-freedom.js`
2. 实现文本选择解锁功能
3. 实现右键菜单恢复
4. 实现快捷键恢复
5. 添加开关控制
6. 测试各种网站兼容性

### 2. 链接管理模块开发
**优先级**: 高
**预计时间**: 3-4天

**开发步骤**:
1. 创建 `src/content/link-manager.js`
2. 实现链接点击拦截
3. 实现新标签页打开逻辑
4. 开发弹框预览功能
5. 添加用户配置选项
6. 集成到设置页面

### 3. 媒体提取模块开发
**优先级**: 中
**预计时间**: 4-5天

**开发步骤**:
1. 创建 `src/content/media-extractor.js`
2. 实现图片提取功能
3. 实现视频检测功能
4. 实现音频提取功能
5. 开发批量下载功能
6. 添加预览界面

## 测试指南

### 1. 功能测试
- 在不同类型的网站上测试各项功能
- 测试与其他扩展的兼容性
- 测试性能影响

### 2. 兼容性测试
- Chrome不同版本测试
- 不同操作系统测试
- 移动设备Chrome测试

### 3. 安全性测试
- XSS攻击防护测试
- 权限使用合规性检查
- 用户数据安全测试

## 性能优化建议

### 1. 代码优化
- 使用事件委托减少事件监听器
- 实现懒加载避免不必要的资源消耗
- 使用防抖和节流优化频繁操作

### 2. 内存管理
- 及时清理不需要的DOM引用
- 避免内存泄漏
- 合理使用缓存

### 3. 网络优化
- 减少不必要的网络请求
- 实现请求缓存
- 使用批量操作减少请求次数

## 发布准备

### 1. 代码审查
- 检查所有功能是否正常工作
- 确保代码符合Chrome Web Store政策
- 移除调试代码和console.log

### 2. 文档完善
- 更新README.md
- 完善用户使用指南
- 准备应用商店描述

### 3. 打包发布
- 创建发布版本
- 准备应用商店截图
- 提交审核

## 常见问题解决

### 1. Service Worker不工作
- 检查manifest.json配置
- 查看扩展管理页面的错误信息
- 确保没有语法错误

### 2. Content Script注入失败
- 检查权限配置
- 确认matches模式正确
- 查看控制台错误信息

### 3. 样式冲突
- 使用CSS命名空间
- 提高CSS选择器优先级
- 使用!important谨慎处理

## 下一步开发建议

1. **立即开始**: 复制限制解除功能（用户需求最强烈）
2. **第二阶段**: 基础链接管理功能
3. **第三阶段**: 图片提取功能
4. **后续优化**: 界面美化和高级功能

记住：始终以用户体验为中心，保持代码简洁和功能稳定！ 