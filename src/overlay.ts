// 遮罩层管理模块

import { initWebSocket, closeWebSocket, sendFinalResultData } from "./websocketClient";
import { fillBase64ToInput, goToNextStep, redirectToTimeoutPage } from "./formHandler";
import { extractFormData } from "./formDataExtractor";
import { WS_URL_STEP2_SEND, WS_URL_STEP2_RECEIVE } from "./config";

const INPUT_SELECTOR = "#app > div > div.main > div > div.form-content > form > div:nth-child(2) > div > div:nth-child(1) > div > input";

// 遮罩层模式类型
type OverlayMode = "step1" | "step2";

// 遮罩层 ID
const OVERLAY_ID = "immigration-bureau-overlay";

// 倒计时相关变量
let countdownInterval: number | null = null;
let countdownSeconds = 30; // 30秒倒计时
let timeoutTimer: number | null = null;
let isProcessing = false; // 防止重复处理

/**
 * 更新倒计时显示
 */
function updateCountdown(seconds: number): void {
  const countdownElement = document.getElementById("overlay-countdown");
  if (countdownElement) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    countdownElement.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    // 倒计时结束时改变颜色提示
    if (seconds <= 5) {
      countdownElement.style.color = "#ff6b6b";
      countdownElement.style.animation = "pulseRed 0.5s ease-in-out infinite";
    } else {
      countdownElement.style.color = "#ffffff";
      countdownElement.style.animation = "none";
    }
  }
}

/**
 * 处理base64数据
 */
function handleBase64Received(base64: string): void {
  if (isProcessing) {
    console.log("正在处理中，忽略重复的base64数据");
    return;
  }
  
  isProcessing = true;
  console.log("收到base64数据，开始处理");
  
  // 停止倒计时
  stopCountdown();
  
  // 关闭WebSocket
  closeWebSocket();
  
  // 隐藏遮罩层
  hideOverlay();
  
  // 填充base64到input
  if (fillBase64ToInput(base64)) {
    // 等待更长时间确保el-upload组件处理完成和Vue响应式系统更新
    // el-upload可能需要时间进行文件验证和预览
    setTimeout(() => {
      // 检查文件是否真的被设置了
      const input = document.querySelector(INPUT_SELECTOR) as HTMLInputElement;
      const backupInput = document.querySelector(".el-upload input[type='file']") as HTMLInputElement;
      const targetInput = input || backupInput;
      
      if (targetInput && targetInput.files && targetInput.files.length > 0) {
        console.log("文件已成功设置，准备跳转下一步");
        
        // 再等待一下，确保上传组件完成处理
        setTimeout(() => {
          // 跳转到下一步
          if (goToNextStep()) {
            console.log("已自动跳转到下一步");
          } else {
            console.warn("跳转下一步失败，可能需要手动点击");
          }
          isProcessing = false;
        }, 800);
      } else {
        console.warn("文件设置可能失败，但继续尝试跳转");
        setTimeout(() => {
          if (goToNextStep()) {
            console.log("已自动跳转到下一步");
          } else {
            console.warn("跳转下一步失败，可能需要手动点击");
          }
          isProcessing = false;
        }, 500);
      }
    }, 1000);
  } else {
    console.error("填充base64失败");
    isProcessing = false;
  }
}

/**
 * 启动30秒倒计时和WebSocket监听
 */
function startCountdownAndWebSocket(wsUrl: string | null = null, mode: OverlayMode = "step1"): void {
  // 清除之前的倒计时
  if (countdownInterval !== null) {
    clearInterval(countdownInterval);
  }
  
  // 清除之前的超时定时器
  if (timeoutTimer !== null) {
    clearTimeout(timeoutTimer);
  }
  
  countdownSeconds = 30;
  updateCountdown(countdownSeconds);
  
  // 启动倒计时
  countdownInterval = window.setInterval(() => {
    countdownSeconds--;
    updateCountdown(countdownSeconds);
    
    if (countdownSeconds <= 0) {
      stopCountdown();
      handleTimeout(mode);
    }
  }, 1000);
  
  // 设置30秒超时
  timeoutTimer = window.setTimeout(() => {
    if (!isProcessing) {
      handleTimeout(mode);
    }
  }, 30000);
  
  if (mode === "step1") {
    // step1: 初始化WebSocket连接等待base64数据
    initWebSocket(wsUrl, handleBase64Received, () => {
      console.log("WebSocket连接成功，等待base64数据...");
    });
  } else if (mode === "step2") {
    // 最后阶段：发送表单数据并监听领取状态
    handleFinalStage();
  }
}

/**
 * 处理超时（step1和step2共用）
 */
function handleTimeout(mode: OverlayMode = "step1"): void {
  if (isProcessing) {
    return;
  }
  
  isProcessing = true;
  console.log(`30秒超时，模式: ${mode}`);
  
  // 停止倒计时
  stopCountdown();
  
  // 关闭WebSocket
  closeWebSocket();
  
  // 隐藏遮罩层
  hideOverlay();
  
  // 跳转到超时页面
  redirectToTimeoutPage();
}

/**
 * 处理最后阶段（凭条领取）
 * 1. 提取表单数据（包括二维码）
 * 2. 连接到 setFinalResultApi 发送数据
 * 3. 连接到 keepReceiptApi 监听领取状态
 */
async function handleFinalStage(): Promise<void> {
  console.log("开始最后阶段：提取表单数据并发送...");
  
  // 提取表单数据（包括name, age, dep等）
  const formData = extractFormData();
  
  if (!formData) {
    console.error("提取表单数据失败，无法继续");
    return;
  }
  
  // 确保二维码已加载（如果是异步加载）
  let qrcodeBase64: string | null = null;
  const qrCodeResult = extractQrCodeBase64Sync();
  if (qrCodeResult && qrCodeResult instanceof Promise) {
    console.log("等待二维码异步加载...");
    qrcodeBase64 = await qrCodeResult;
  } else if (qrCodeResult) {
    qrcodeBase64 = qrCodeResult;
  }
  
  // 更新二维码数据
  if (qrcodeBase64) {
    formData.qrcode = qrcodeBase64;
    console.log("二维码已加载，base64长度:", qrcodeBase64.length);
  } else {
    console.warn("未能提取二维码，将发送不含二维码的数据");
  }
  
  // 步骤1: 连接到 setFinalResultApi 发送表单数据
  initWebSocket(WS_URL_STEP2_SEND, () => {
    // 消息回调不会被调用（我们只发送数据）
  }, () => {
    console.log("已连接到 setFinalResultApi，发送表单数据...");
    // 连接成功后立即发送表单数据
    sendFinalResultData(formData);
    
    // 发送完成后关闭连接
    setTimeout(() => {
      closeWebSocket();
      console.log("表单数据已发送，开始监听领取状态...");
      
      // 步骤2: 连接到 keepReceiptApi 监听领取状态
      initWebSocket(WS_URL_STEP2_RECEIVE, (message) => {
        // 解析领取状态消息
        try {
          const data = typeof message === "string" ? JSON.parse(message) : message;
          console.log("收到领取状态消息:", data);
          
          // 检查 isKeep 字段
          if (data.isKeep === 1) {
            console.log("凭条已取走，完成最后阶段");
            handleFinalStageComplete();
          } else if (data.isKeep === 0) {
            console.log("凭条尚未取走，继续等待...");
            // 继续等待，不执行任何操作
          } else {
            console.warn("未识别的领取状态:", data);
          }
        } catch (error) {
          console.error("解析领取状态消息失败:", error);
        }
      }, () => {
        console.log("已连接到 keepReceiptApi，等待领取状态...");
      });
    }, 500); // 等待500ms确保数据已发送
  });
}

/**
 * 同步提取二维码（内部函数，避免循环依赖）
 */
function extractQrCodeBase64Sync(): string | null | Promise<string | null> {
  try {
    const qrCodeElement = document.querySelector("#app > div > div.main > div > div.info-content > ul > li.line-qr-code > div");
    if (!qrCodeElement) return null;
    
    let imgElement = qrCodeElement.querySelector("img") as HTMLImageElement;
    if (!imgElement) {
      const canvas = qrCodeElement.querySelector("canvas") as HTMLCanvasElement;
      if (canvas) {
        try {
          return canvas.toDataURL("image/png");
        } catch (e) {
          console.warn("canvas转base64失败:", e);
        }
      }
      const svg = qrCodeElement.querySelector("svg");
      if (svg) {
        try {
          const svgData = new XMLSerializer().serializeToString(svg);
          return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
        } catch (e) {
          console.warn("SVG转base64失败:", e);
        }
      }
      return null;
    }
    
    if (imgElement.src.startsWith("data:image")) {
      return imgElement.src;
    }
    
    // 异步加载URL图片
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = imgElement.src;
    });
  } catch (error) {
    console.error("提取二维码失败:", error);
    return null;
  }
}

/**
 * 处理最后阶段完成（凭条已领取）
 */
function handleFinalStageComplete(): void {
  if (isProcessing) {
    return;
  }
  
  isProcessing = true;
  console.log("凭条已领取，完成最后阶段");
  
  // 停止倒计时
  stopCountdown();
  
  // 关闭WebSocket
  closeWebSocket();
  
  // 隐藏遮罩层
  hideOverlay();
  
  // 跳转到完成页面
  redirectToTimeoutPage();
  
  isProcessing = false;
}

/**
 * 停止倒计时
 */
function stopCountdown(): void {
  if (countdownInterval !== null) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  
  if (timeoutTimer !== null) {
    clearTimeout(timeoutTimer);
    timeoutTimer = null;
  }
}

/**
 * 显示遮罩层
 * @param wsUrl WebSocket服务器地址，如果为null则使用模拟模式
 * @param mode 遮罩层模式：step1（刷证件）或 step2（取凭条）
 */
export function showOverlay(wsUrl: string | null = null, mode: OverlayMode = "step1"): void {
  // 如果已经存在，不重复创建
  if (document.getElementById(OVERLAY_ID)) {
    return;
  }

  isProcessing = false; // 重置处理状态

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  
  // 根据模式选择不同的图片资源
  let imageUrl: string;
  let imageAlt: string;
  
  if (mode === "step2") {
    // step2: 去取凭条动画
    imageUrl = chrome.runtime.getURL("assets/id-card-scan-end.gif");
    imageAlt = "去取凭条动画";
  } else {
    // step1: 刷证件动画
    imageUrl = chrome.runtime.getURL("assets/id-card-scan.gif");
    imageAlt = "请刷证件动画";
  }
  
  // 调试：输出图片URL
  console.log(`遮罩层图片URL (${mode}):`, imageUrl);
  
  overlay.innerHTML = `
    <div class="overlay-content">
      <div class="overlay-gif-container">
        <img 
          src="${imageUrl}" 
          alt="${imageAlt}"
          class="overlay-gif"
          onload="console.log('图片加载成功:', '${imageUrl}')"
          onerror="console.error('图片加载失败:', '${imageUrl}'); this.style.display='none'; this.parentElement.innerHTML='<div style=\\'color: white; font-size: 16px; padding: 20px; text-align: center;\\'>图片文件未找到<br/>路径: ${imageUrl}</div>'"
        />
      </div>
      <div id="overlay-countdown" class="overlay-countdown">00:30</div>
    </div>
  `;

  document.body.appendChild(overlay);
  
  // 启动30秒倒计时和WebSocket监听
  startCountdownAndWebSocket(wsUrl, mode);
  
  if (mode === "step2") {
    console.log("遮罩层已显示（step2），30秒倒计时开始，等待凭条领取...");
  } else {
    console.log("遮罩层已显示（step1），30秒倒计时开始，等待base64数据...");
  }
}

/**
 * 隐藏遮罩层
 */
export function hideOverlay(): void {
  // 停止倒计时
  stopCountdown();
  
  // 关闭WebSocket
  closeWebSocket();
  
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
    console.log("遮罩层已隐藏");
  }
}

