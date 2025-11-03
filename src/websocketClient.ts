// WebSocket 客户端模块 - 用于接收base64图片地址

// WebSocket 连接状态
let ws: WebSocket | null = null;
let reconnectTimer: number | null = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// 回调函数类型
type MessageCallback = (data: string) => void;
type ConnectionCallback = () => void;

let onMessageCallback: MessageCallback | null = null;
let onConnectedCallback: ConnectionCallback | null = null;

/**
 * 初始化WebSocket连接
 * @param url WebSocket服务器地址（如果为null则使用模拟模式）
 * @param onMessage 接收到消息时的回调
 * @param onConnected 连接成功时的回调
 */
export function initWebSocket(
  url: string | null,
  onMessage: MessageCallback,
  onConnected?: ConnectionCallback
): void {
  onMessageCallback = onMessage;
  onConnectedCallback = onConnected || null;

  // 如果URL为null，使用模拟模式
  if (!url) {
    console.log("使用模拟模式 - 将在5秒后发送模拟base64数据");
    simulateBase64Message();
    return;
  }

  connectWebSocket(url);
}

/**
 * 连接WebSocket
 */
function connectWebSocket(url: string): void {
  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("WebSocket连接成功");
      isConnected = true;
      reconnectAttempts = 0;
      if (onConnectedCallback) {
        onConnectedCallback();
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // 假设后端发送的格式为 { base64: "data:image/png;base64,..." } 或直接是base64字符串
        const base64Data = data.base64 || data.image || event.data;
        
        if (onMessageCallback && base64Data) {
          console.log("收到base64图片数据");
          onMessageCallback(base64Data);
        }
      } catch (error) {
        // 如果不是JSON，直接作为base64字符串处理
        if (onMessageCallback && event.data) {
          console.log("收到base64图片数据（字符串格式）");
          onMessageCallback(event.data);
        }
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket错误:", error);
      isConnected = false;
    };

    ws.onclose = () => {
      console.log("WebSocket连接关闭");
      isConnected = false;
      ws = null;
      
      // 自动重连
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // 指数退避，最多10秒
        console.log(`将在 ${delay}ms 后尝试重连 (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        
        reconnectTimer = window.setTimeout(() => {
          connectWebSocket(url);
        }, delay);
      } else {
        console.error("WebSocket重连失败，已达到最大重连次数");
      }
    };
  } catch (error) {
    console.error("WebSocket连接失败:", error);
    isConnected = false;
  }
}

/**
 * 模拟base64消息（用于测试）
 */
function simulateBase64Message(): void {
  // 模拟在5秒后发送base64数据（你可以修改这个时间来测试不同场景）
  const delay = 5000; // 5秒
  
  setTimeout(() => {
    // 创建一个小的测试base64图片（1x1透明像素）
    const mockBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    
    console.log("模拟模式：发送模拟base64数据");
    if (onMessageCallback) {
      onMessageCallback(mockBase64);
    }
  }, delay);
}

/**
 * 关闭WebSocket连接
 */
export function closeWebSocket(): void {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  if (ws) {
    ws.close();
    ws = null;
    isConnected = false;
  }
  
  onMessageCallback = null;
  onConnectedCallback = null;
}

/**
 * 检查WebSocket连接状态
 */
export function isWebSocketConnected(): boolean {
  return isConnected && ws?.readyState === WebSocket.OPEN;
}

/**
 * 发送文档信号给后端（通知已获取相关信息）
 */
export function sendDocumentSignal(): void {
  if (!isWebSocketConnected()) {
    console.warn("WebSocket未连接，无法发送文档信号");
    return;
  }
  
  try {
    const message = JSON.stringify({
      type: "document_signal",
      message: "已获取相关信息",
      timestamp: new Date().toISOString()
    });
    
    ws?.send(message);
    console.log("已发送文档信号给后端:", message);
  } catch (error) {
    console.error("发送文档信号失败:", error);
  }
}

