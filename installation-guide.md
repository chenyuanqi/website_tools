# 🔧 网页工具箱Chrome扩展 - 详细安装指南

## 📋 安装前检查

### 系统要求
- **Chrome浏览器版本：** 88+ （支持Manifest V3）
- **操作系统：** Windows, macOS, Linux
- **磁盘空间：** 约5MB

### 检查Chrome版本
1. 打开Chrome浏览器
2. 点击右上角三点菜单 → 帮助 → 关于Google Chrome
3. 确认版本号为88或更高版本

## 🚀 详细安装步骤

### 第一步：打开扩展管理页面
1. **方法一：** 在地址栏输入 `chrome://extensions/` 并按回车
2. **方法二：** 点击Chrome菜单 → 更多工具 → 扩展程序

### 第二步：启用开发者模式
1. 在扩展管理页面右上角找到"开发者模式"开关
2. 点击开关，确保显示为"已启用"状态
3. 页面会刷新并显示新的按钮选项

### 第三步：加载扩展
1. 点击页面左上角的"加载已解压的扩展程序"按钮
2. 在文件选择对话框中导航到项目目录：
   ```
   /Users/mac/Code/Mine/website_tools
   ```
3. 选择包含 `manifest.json` 的文件夹
4. 点击"选择文件夹"按钮

### 第四步：验证安装
安装成功后，您应该看到：
- ✅ 扩展出现在扩展列表中
- ✅ 扩展标题显示为"网页工具箱"
- ✅ 版本号显示为"1.0.0"
- ✅ 状态显示为"已启用"
- ✅ Chrome工具栏出现🔧图标

## 🧪 功能验证

### 快速验证步骤
1. **打开验证页面：** 在浏览器中打开 `check-installation.html`
2. **测试弹出窗口：** 点击工具栏的🔧图标
3. **测试侧边栏：** 右键点击🔧图标 → "打开侧边栏"
4. **测试设置页面：** 右键点击🔧图标 → "选项"

## 🐛 常见问题解决

### 问题1：扩展无法加载
**解决方案：**
1. 检查文件路径是否正确
2. 确认 `manifest.json` 文件存在
3. 验证JSON语法：`python3 -m json.tool manifest.json`

### 问题2：扩展加载后无反应
**解决方案：**
1. 刷新扩展：在扩展管理页面点击刷新按钮
2. 重启Chrome浏览器
3. 检查控制台错误

### 问题3：内容脚本未注入
**解决方案：**
1. 检查页面权限：确认访问的是http/https页面
2. 刷新测试页面
3. 检查console错误信息

## 📱 测试清单

### 基础功能测试
- [ ] 扩展成功加载，无错误信息
- [ ] 工具栏图标正常显示
- [ ] 弹出窗口正常工作
- [ ] 侧边栏正常显示
- [ ] 设置页面正常打开

### 功能模块测试
- [ ] 复制自由功能正常
- [ ] 链接管理功能正常
- [ ] 媒体提取功能正常
- [ ] 设置保存和加载正常

## 🎯 下一步

安装验证成功后：
1. 使用 `test-page.html` 进行全面测试
2. 根据需要调整设置选项
3. 在常用网站上体验扩展功能

---

**祝您使用愉快！🎉** 