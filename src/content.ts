// Content Script - 在网页上下文中运行
import "./content.css";
import { observeStepChanges, watchUrlChanges } from "./overlayController";
import { showOverlay, hideOverlay } from "./overlay";
import { isFirstStepActive } from "./pageState";

console.log("内容脚本已加载 - 移民局扩展");

// 页面加载完成后初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    observeStepChanges();
    watchUrlChanges();
  });
} else {
  observeStepChanges();
  watchUrlChanges();
}

// 监听来自 background 或 popup 的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_PAGE_INFO") {
    const pageInfo = {
      title: document.title,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      hasFirstStep: isFirstStepActive(),
    };
    sendResponse(pageInfo);
  } else if (message.type === "TOGGLE_OVERLAY") {
    if (message.show) {
      showOverlay();
    } else {
      hideOverlay();
    }
    sendResponse({ success: true });
  }
  return true;
});
