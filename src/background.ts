// Background Service Worker - 后台服务脚本
console.log("后台服务脚本已加载 - 移民局扩展");

// 扩展安装时的处理
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("扩展已安装");
  } else if (details.reason === "update") {
    console.log("扩展已更新");
  }
});

// 监听来自 content script 或 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("后台收到消息:", message);
  
  if (message.type === "GET_TAB_INFO") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({
          url: tabs[0].url,
          title: tabs[0].title,
        });
      }
    });
    return true; // 保持消息通道开放
  }
  
  return false;
});

// 标签页更新监听
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url?.includes("entry-registation-form")) {
    console.log("目标页面已加载:", tab.url);
  }
});
