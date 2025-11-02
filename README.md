# 移民局扩展 - Chrome 浏览器扩展

这是一个 Chrome 浏览器扩展，用于在移民局网站表单页面显示全屏遮罩提示。当用户进入入境卡填报表单的第一步（证件资料页上传）时，自动显示"请刷证件"的提示界面。

## 📋 功能特性

- ✅ 智能页面检测：自动检测目标页面 URL
- ✅ 步骤状态检测：检测 Element UI Steps 组件的第一步是否激活
- ✅ 实时监听：使用 MutationObserver 监听 DOM 变化
- ✅ 全屏遮罩：半透明黑色背景，居中显示提示文字和动画 GIF
- ✅ 平滑动画：淡入淡出、脉冲、缩放等动画效果
- ✅ 响应式设计：支持不同屏幕尺寸

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

如果没有安装 pnpm，可以使用以下命令安装：

```bash
npm install -g pnpm
```

### 开发模式

```bash
pnpm dev
```

开发模式会监听文件变化并自动重新构建。

### 构建生产版本

```bash
pnpm build
```

构建完成后，扩展文件会在 `dist/` 目录中。

## 📦 安装扩展

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 打开右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目中的 `dist/` 目录

## 📁 项目结构

```
项目根目录/
├── src/
│   ├── manifest.json       # 扩展配置文件 (Manifest V3)
│   ├── content.ts          # 内容脚本（核心逻辑）
│   ├── content.css         # 遮罩层样式
│   ├── background.ts       # 后台服务脚本
│   ├── assets/             # 资源文件目录
│   │   └── id-card-scan.gif # GIF 动画文件（需自行添加）
│   └── icons/              # 扩展图标（需自行添加）
├── dist/                   # 构建输出目录
├── package.json            # 项目配置
├── vite.config.ts         # Vite 构建配置
└── tsconfig.json          # TypeScript 配置
```

## 🔧 配置说明

### 修改目标 URL

如果需要修改检测的目标 URL，请编辑 `src/content.ts` 文件：

```typescript
// 修改这里的 URL 匹配条件
if (!currentUrl.includes("your-target-url")) {
  return;
}
```

### 修改步骤检测选择器

如果需要修改步骤检测的选择器，请编辑 `src/content.ts` 文件中的相关代码：

```typescript
const steps = document.querySelectorAll(".your-step-selector");
```

### 添加 GIF 动画

1. 将 GIF 文件命名为 `id-card-scan.gif`
2. 放置在 `src/assets/` 目录下
3. 重新构建项目

## 🛠️ 技术栈

- **Vite** - 构建工具
- **TypeScript** - 类型支持
- **Chrome Extensions Manifest V3** - 扩展规范

## 📝 开发注意事项

1. **资源文件路径**: 使用 `chrome.runtime.getURL()` 获取扩展资源路径
2. **内容脚本**: 运行在网页上下文中，可以访问 DOM
3. **后台脚本**: 使用 Service Worker，不能使用 DOM API
4. **权限配置**: 在 `manifest.json` 中配置所需权限

## 🐛 调试

1. 在扩展管理页面找到你的扩展，点击"检查视图" → "Service Worker" 查看后台脚本日志
2. 在目标网页按 F12 打开开发者工具，在 Console 中查看内容脚本日志
3. 使用 `console.log` 输出调试信息

## 📄 许可证

MIT

## 📚 相关文档

详细的功能说明和技术文档请参考 `核心功能文档.md`

---

**版本**: 1.0.0  
**最后更新**: 2024
