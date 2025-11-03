// 遮罩层控制器 - 负责根据页面状态控制遮罩层的显示和隐藏

import { showOverlay, hideOverlay } from "./overlay";
import { isTargetPage, isPageLoaded, isFirstStepActive, hasStepsContainer, waitForCondition, isSuccessPage } from "./pageState";

/**
 * 检查成功页面并显示遮罩层（step2）
 */
function checkAndShowSuccessOverlay(): void {
  // 检查是否是成功页面
  if (!isSuccessPage()) {
    hideOverlay();
    return;
  }

  // 等待页面加载完成
  if (!isPageLoaded()) {
    window.addEventListener("load", checkAndShowSuccessOverlay, { once: true });
    return;
  }

  // 等待二维码元素渲染
  setTimeout(() => {
    const qrCodeElement = document.querySelector("#app > div > div.main > div > div.info-content > ul > li.line-qr-code > div");
    
    if (!qrCodeElement) {
      // 如果还没渲染，再次尝试
      waitForCondition(
        () => isSuccessPage(),
        checkAndShowSuccessOverlay,
        10,
        500
      );
      return;
    }

    // 隐藏二维码元素（遮住二维码，不显示二维码）
    if (qrCodeElement instanceof HTMLElement) {
      qrCodeElement.style.display = "none";
    }
    
    // 也尝试隐藏父元素，确保二维码完全被遮住
    const qrCodeParent = qrCodeElement.parentElement;
    if (qrCodeParent) {
      qrCodeParent.style.display = "none";
    }
    
    // 显示step2遮罩层
    showOverlay(null, "step2");
  }, 1000);
}

/**
 * 检查页面状态并显示/隐藏遮罩层
 */
export function checkAndShowOverlay(): void {
  // 优先检查是否是成功页面（step2）
  if (isSuccessPage()) {
    checkAndShowSuccessOverlay();
    return;
  }
  
  // 检查是否是表单页面（step1）
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
      showOverlay(null, "step1");
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
 * 监听 URL 变化和DOM变化（Vue Router 可能改变 URL，或动态添加元素）
 */
export function watchUrlChanges(): void {
  let lastUrl = window.location.href;
  
  // 监听URL变化
  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      checkAndShowOverlay();
    }
  }, 1000);
  
  // 监听DOM变化，检测二维码元素是否出现
  const observer = new MutationObserver(() => {
    if (isSuccessPage()) {
      checkAndShowSuccessOverlay();
    }
  });
  
  // 观察body的变化
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

