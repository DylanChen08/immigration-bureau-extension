# 快速启动指南

## 📦 使用 pnpm 安装和构建

### 1. 安装依赖

```bash
pnpm install
```

### 2. 开发模式（监听文件变化）

```bash
pnpm dev
```

### 3. 构建生产版本

```bash
pnpm build
```

构建完成后，所有文件都会在 `dist/` 目录中。

## 📁 构建后的文件结构

```
dist/
├── manifest.json       # 扩展配置
├── content.js         # 内容脚本（编译后的）
├── content.css        # 样式文件
├── background.js      # 后台脚本（编译后的）
├── assets/            # 资源文件目录
│   └── id-card-scan.gif  # GIF 动画（需要自己添加）
└── icons/             # 图标目录（可选）
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 🔧 在 Chrome 中加载扩展

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 打开右上角的"开发者模式"开关
4. 点击"加载已解压的扩展程序"
5. 选择项目根目录下的 `dist/` 文件夹

## ⚠️ 注意事项

1. **GIF 文件**：需要将 `id-card-scan.gif` 放置在 `src/assets/` 目录下，构建时会自动复制到 `dist/assets/`

2. **图标文件**（可选）：如果需要图标，将以下尺寸的 PNG 文件放在 `src/icons/` 目录：
   - `icon16.png` (16x16)
   - `icon48.png` (48x48)
   - `icon128.png` (128x128)

3. **URL 配置**：默认检测包含 `entry-registation-form` 的 URL，如需修改请编辑 `src/content.ts`

## 🐛 调试

- **内容脚本调试**：在目标网页按 F12，在 Console 中查看日志
- **后台脚本调试**：在扩展管理页面，点击"检查视图" → "Service Worker"

## 📝 开发工作流

1. 修改源代码（`src/` 目录）
2. 运行 `pnpm dev` 自动重新构建
3. 在 Chrome 扩展管理页面点击扩展的刷新按钮
4. 刷新目标网页测试

---
