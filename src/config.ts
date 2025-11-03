// 配置模块 - WebSocket 和系统配置

/**
 * 获取本地 WebSocket 地址
 * 连接到同一台计算机上的可执行程序
 */
export function getLocalWebSocketUrl(): string {
  // 使用 localhost 连接本地端口 60001
  // 如果 localhost 不可用，可以尝试 127.0.0.1
  const port = 60001;
  const hostname = "localhost"; // 同一台计算机，使用 localhost
  
  return `ws://${hostname}:${port}`;
}

/**
 * WebSocket 服务器端口（本地可执行程序监听端口）
 */
export const WS_PORT = 60001;

/**
 * WebSocket API 路径
 */
// step1: 接收 base64 数据
export const WS_SEND_DOCUMENT_SIGNAL_API = "/sendDocumentSignalApi";

// step2: 发送表单数据给 exe
export const WS_SET_FINAL_RESULT_API = "/setFinalResultApi";

// step2: 监听凭条领取状态
export const WS_KEEP_RECEIPT_API = "/keepReceiptApi";

/**
 * WebSocket 服务器地址
 */
// step1: ws://localhost:60001/sendDocumentSignalApi
// 响应格式：{ base64: "xxxxx" }
export const WS_URL_STEP1 = `ws://localhost:${WS_PORT}${WS_SEND_DOCUMENT_SIGNAL_API}`;

// step2: ws://localhost:60001/setFinalResultApi (发送表单数据)
export const WS_URL_STEP2_SEND = `ws://localhost:${WS_PORT}${WS_SET_FINAL_RESULT_API}`;

// step2: ws://localhost:60001/keepReceiptApi (监听领取状态)
export const WS_URL_STEP2_RECEIVE = `ws://localhost:${WS_PORT}${WS_KEEP_RECEIPT_API}`;

/**
 * 兼容旧代码（step1 使用）
 */
export const WS_URL = WS_URL_STEP1;

