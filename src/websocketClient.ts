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

  // 如果URL为null或空字符串，使用模拟模式（仅用于测试）
  if (!url || url.trim() === "") {
    console.warn("WebSocket URL 为空，使用模拟模式 - 将在5秒后发送模拟base64数据");
    console.warn("提示：请配置正确的 WebSocket 地址连接到本地可执行程序");
    simulateBase64Message();
    return;
  }

  // 使用真实的 WebSocket 连接
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
        console.log("收到WebSocket消息:", data);
        
        // 解析消息格式：{ base64: "xxxxx" }
        // exe 程序发送的格式：{ base64: "xxxxx" }
        const base64Data = data.base64;
        
        if (base64Data) {
          if (onMessageCallback) {
            console.log("解析到base64图片数据，长度:", base64Data.length);
            onMessageCallback(base64Data);
          } else {
            console.warn("未设置消息回调函数");
          }
        } else {
          console.warn("消息中未找到base64字段，消息内容:", data);
          // 尝试备用字段（向后兼容）
          const fallbackData = data.image || data.data;
          if (fallbackData && onMessageCallback) {
            console.log("使用备用字段:", fallbackData ? "image" : "data");
            onMessageCallback(fallbackData);
          }
        }
      } catch (error) {
        // 如果不是JSON，尝试直接作为base64字符串处理
        console.warn("解析JSON失败，尝试作为字符串处理:", error);
        if (onMessageCallback && event.data) {
          // 检查是否是纯base64字符串（没有JSON包装）
          const dataStr = event.data.toString();
          if (dataStr.startsWith("data:image") || dataStr.length > 100) {
            console.log("收到base64图片数据（字符串格式）");
            onMessageCallback(dataStr);
          } else {
            console.error("无法识别的消息格式:", event.data);
          }
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
 * @deprecated 使用 sendFinalResultData 替代
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

/**
 * 发送最终结果数据给exe（最后阶段：表单数据）
 * @param formData 表单数据对象 { name, age, dep, ..., qrcode }
 */
export function sendFinalResultData(formData: { [key: string]: any }): void {
  if (!isWebSocketConnected()) {
    console.warn("WebSocket未连接，无法发送最终结果数据");
    return;
  }
  
  try {
    const message = JSON.stringify(formData);
    ws?.send(message);
    console.log("已发送最终结果数据给exe:", formData);
  } catch (error) {
    console.error("发送最终结果数据失败:", error);
  }
}

