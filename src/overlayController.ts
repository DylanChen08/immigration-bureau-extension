// 遮罩层控制器 - 负责根据页面状态控制遮罩层的显示和隐藏

import { showOverlay, hideOverlay } from "./overlay";
import { isTargetPage, isPageLoaded, isFirstStepActive, hasStepsContainer, waitForCondition } from "./pageState";

/**
 * 检查页面状态并显示/隐藏遮罩层
 */
export function checkAndShowOverlay(): void {
  // 检查 URL
  if (!isTargetPage()) {
    hideOverlay();
    return;
  }

  // 等待页面加载完成
  if (!isPageLoaded()) {
    window.addEventListener("load", checkAndShowOverlay, { once: true });
    return;
  }

  // 等待 Vue 组件渲染（Element UI）
  setTimeout(() => {
    // 如果步骤还没渲染，再次尝试
    if (!hasStepsContainer()) {
      waitForCondition(
        hasStepsContainer,
        checkAndShowOverlay,
        10,
        500
      );
      return;
    }

    // 检查是否是第一步
    if (isFirstStepActive()) {
      showOverlay();
    } else {
      hideOverlay();
    }
  }, 1000);
}

/**
 * 使用 MutationObserver 监听步骤变化
 */
export function observeStepChanges(): void {
  const stepsContainer = document.querySelector(".el-steps");
  if (!stepsContainer) {
    setTimeout(observeStepChanges, 500);
    return;
  }

  const observer = new MutationObserver(() => {
    checkAndShowOverlay();
  });

  observer.observe(stepsContainer, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  // 初始检查
  checkAndShowOverlay();
}

/**
 * 监听 URL 变化（Vue Router 可能改变 URL）
 */
export function watchUrlChanges(): void {
  let lastUrl = window.location.href;
  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      checkAndShowOverlay();
    }
  }, 1000);
}

