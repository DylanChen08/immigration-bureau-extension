// 页面状态检查模块

/**
 * 检查是否是目标页面
 */
export function isTargetPage(): boolean {
  const currentUrl = window.location.href;
  return currentUrl.includes("entry-registation-form");
}

/**
 * 检查页面是否完全加载
 */
export function isPageLoaded(): boolean {
  return document.readyState === "complete";
}

/**
 * 检查是否是第一步（el-step）
 */
export function isFirstStepActive(): boolean {
  const steps = document.querySelectorAll(".el-step");
  if (steps.length === 0) {
    return false;
  }

  const firstStep = steps[0];
  return (
    firstStep?.querySelector(".is-process") !== null ||
    firstStep?.querySelector(".el-step__head.is-process") !== null ||
    firstStep?.classList.contains("is-process")
  );
}

/**
 * 检查步骤容器是否存在
 */
export function hasStepsContainer(): boolean {
  return document.querySelector(".el-steps") !== null;
}

/**
 * 等待条件满足（用于异步检查）
 */
export function waitForCondition(
  condition: () => boolean,
  callback: () => void,
  maxAttempts: number = 10,
  interval: number = 500
): void {
  let attempts = 0;
  const checkInterval = setInterval(() => {
    attempts++;
    if (condition() || attempts >= maxAttempts) {
      clearInterval(checkInterval);
      if (condition()) {
        callback();
      }
    }
  }, interval);
}

