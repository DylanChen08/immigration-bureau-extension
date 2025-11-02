// 遮罩层管理模块

// 遮罩层 ID
const OVERLAY_ID = "immigration-bureau-overlay";

/**
 * 显示遮罩层
 */
export function showOverlay(): void {
  // 如果已经存在，不重复创建
  if (document.getElementById(OVERLAY_ID)) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  
  // 获取 GIF 资源 URL
  const gifUrl = chrome.runtime.getURL("assets/id-card-scan.gif");
  
  overlay.innerHTML = `
    <div class="overlay-content">
      <div class="overlay-text">请刷证件33333</div>
      <div class="overlay-gif-container">
        <img 
          src="${gifUrl}" 
          alt="请刷证件动画"
          class="overlay-gif"
          onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'color: white; font-size: 16px; padding: 20px;\\'>GIF 文件未找到，请将 id-card-scan.gif 放置在 src/assets/ 目录下</div>'"
        />
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  console.log("遮罩层已显示");
}

/**
 * 隐藏遮罩层
 */
export function hideOverlay(): void {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
    console.log("遮罩层已隐藏");
  }
}

