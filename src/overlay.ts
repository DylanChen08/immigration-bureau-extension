// 遮罩层管理模块

import { initWebSocket, closeWebSocket, sendDocumentSignal } from "./websocketClient";
import { fillBase64ToInput, goToNextStep, redirectToTimeoutPage } from "./formHandler";

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
    // step2: 发送文档信号并监听领取完成信号
    if (wsUrl) {
      // 有WebSocket URL，正常连接
      initWebSocket(wsUrl, (message) => {
        // step2接收到消息表示凭条已领取
        try {
          const data = typeof message === "string" ? JSON.parse(message) : message;
          if (data.type === "document_received" || data.type === "complete" || message === "complete") {
            handleStep2Complete();
          }
        } catch {
          // 如果不是JSON，也认为完成了
          handleStep2Complete();
        }
      }, () => {
        console.log("WebSocket连接成功，发送文档信号...");
        // 连接成功后立即发送文档信号
        sendDocumentSignal();
      });
    } else {
      // 没有WebSocket URL，直接发送信号（可能会失败，但不影响流程）
      console.log("模拟模式：发送文档信号（已获取相关信息）");
      // 尝试发送信号（如果之前有WebSocket连接）
      sendDocumentSignal();
      // 注意：在模拟模式下，需要手动检测凭条是否已领取
      // 这里可以添加DOM监听或其他检测机制
    }
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
 * 处理step2的完成（凭条已领取）
 */
function handleStep2Complete(): void {
  if (isProcessing) {
    return;
  }
  
  isProcessing = true;
  console.log("凭条已领取，提前完成");
  
  // 停止倒计时
  stopCountdown();
  
  // 关闭WebSocket
  closeWebSocket();
  
  // 隐藏遮罩层
  hideOverlay();
  
  // step2完成后可能需要跳转，但用户没有指定跳转地址
  // 保持当前页面或可以添加跳转逻辑
  console.log("step2完成，保持当前页面");
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

