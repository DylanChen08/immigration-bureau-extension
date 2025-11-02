import { defineConfig } from 'vite';
import { resolve } from 'path';
import { mkdirSync, existsSync, copyFileSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 递归复制目录
function copyDir(src: string, dest: string) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }
  
  const entries = readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = resolve(src, entry.name);
    const destPath = resolve(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// 自定义插件：复制 manifest.json 和资源文件到 dist
const copyManifestPlugin = () => {
  return {
    name: 'copy-manifest',
    writeBundle() {
      const srcManifest = resolve(__dirname, 'src/manifest.json');
      const distManifest = resolve(__dirname, 'dist/manifest.json');
      
      if (existsSync(srcManifest)) {
        // 确保 dist 目录存在
        const distDir = resolve(__dirname, 'dist');
        if (!existsSync(distDir)) {
          mkdirSync(distDir, { recursive: true });
        }
        
        // 读取并处理 manifest.json
        const manifest = JSON.parse(readFileSync(srcManifest, 'utf-8'));
        
        // 更新 content_scripts 中的文件路径
        if (manifest.content_scripts) {
          manifest.content_scripts.forEach((script: any) => {
            if (script.js) {
              script.js = script.js.map((file: string) => {
                return file.replace(/\.ts$/, '.js');
              });
            }
            if (script.css) {
              script.css = script.css.map((file: string) => {
                return file.replace(/\.css$/, '.css');
              });
            }
          });
        }
        
        // 更新 background service_worker 路径
        if (manifest.background?.service_worker) {
          manifest.background.service_worker = manifest.background.service_worker.replace(/\.ts$/, '.js');
        }
        
        writeFileSync(distManifest, JSON.stringify(manifest, null, 2));
        console.log('✓ manifest.json 已复制到 dist');
      }
      
      // 复制 assets 目录
      const srcAssets = resolve(__dirname, 'src/assets');
      const distAssets = resolve(__dirname, 'dist/assets');
      if (existsSync(srcAssets)) {
        copyDir(srcAssets, distAssets);
        console.log('✓ assets 目录已复制到 dist');
      }
      
      // 复制 icons 目录
      const srcIcons = resolve(__dirname, 'src/icons');
      const distIcons = resolve(__dirname, 'dist/icons');
      if (existsSync(srcIcons)) {
        copyDir(srcIcons, distIcons);
        console.log('✓ icons 目录已复制到 dist');
      }
    }
  };
};

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content.ts'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          // CSS 文件保持原样，放在根目录
          if (assetInfo.name?.endsWith('.css')) {
            return '[name][extname]';
          }
          // 其他资源文件放在 assets 目录
          return 'assets/[name][extname]';
        }
      }
    },
    // 不压缩，便于调试（生产环境可以改为 true）
    minify: false,
    sourcemap: false,
  },
  plugins: [
    copyManifestPlugin(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
