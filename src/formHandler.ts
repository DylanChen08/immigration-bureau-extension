// 表单处理模块 - 负责填充base64和跳转

const INPUT_SELECTOR = "#app > div > div.main > div > div.form-content > form > div:nth-child(2) > div > div:nth-child(1) > div > input";
const TIMEOUT_REDIRECT_URL = "https://s.nia.gov.cn/ArrivalCardFillingPC/entry-registation-notice";

/**
 * 将base64字符串转换为File对象
 */
function base64ToFile(base64: string, filename: string = "id-card.png"): File {
  // 处理base64字符串，可能是data:image/png;base64,xxx格式
  const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
  
  // 将base64转换为二进制
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // 确定MIME类型
  let mimeType = "image/png";
  if (base64.includes("data:image")) {
    const mimeMatch = base64.match(/data:image\/([^;]+)/);
    if (mimeMatch) {
      mimeType = `image/${mimeMatch[1]}`;
      // 如果扩展名不匹配，更新filename
      const ext = mimeMatch[1];
      if (filename !== `id-card.${ext}`) {
        filename = `id-card.${ext}`;
      }
    }
  }
  
  // 创建Blob并转换为File
  const blob = new Blob([bytes], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

/**
 * 填充base64图片到el-upload组件
 */
export function fillBase64ToInput(base64: string): boolean {
  try {
    // 优先查找 el-upload 组件内的 input（最可靠）
    let input = document.querySelector(".el-upload input[type='file']") as HTMLInputElement;
    
    if (!input) {
      // 备用方法：使用选择器查找
      input = document.querySelector(INPUT_SELECTOR) as HTMLInputElement;
    }
    
    if (!input) {
      // 最后尝试：查找所有 el-upload__input
      input = document.querySelector(".el-upload__input") as HTMLInputElement;
    }
    
    if (!input) {
      console.error("未找到目标input元素，尝试的选择器:");
      console.error("1. .el-upload input[type='file']");
      console.error("2. " + INPUT_SELECTOR);
      console.error("3. .el-upload__input");
      return false;
    }

    console.log("找到input元素:", input);
    return setFileToInput(input, base64);
  } catch (error) {
    console.error("填充base64失败:", error);
    return false;
  }
}

/**
 * 将File对象设置到input元素
 * 基于 BASE64_UPLOAD_TECHNICAL_SOLUTION.md 优化，确保照片回显和正常提交
 */
function setFileToInput(input: HTMLInputElement, base64: string): boolean {
  try {
    // 将base64转换为File对象
    const file = base64ToFile(base64);
    console.log("转换后的文件:", file.name, file.type, file.size);
    
    // 检查input类型
    if (input.type !== "file") {
      console.error("input元素类型不是file:", input.type);
      return false;
    }
    
    // 使用DataTransfer API创建FileList（文档推荐的核心方案）
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    
    // 直接设置files属性（核心步骤，文档中的关键方法）
    try {
      (input as any).files = dataTransfer.files;
    } catch (e) {
      // 如果不支持，使用Object.defineProperty作为备用方案
      try {
        Object.defineProperty(input, "files", {
          value: dataTransfer.files,
          writable: false,
          configurable: true
        });
      } catch (e2) {
        console.error("无法设置files属性:", e2);
        return false;
      }
    }
    
    // 触发标准change事件（文档推荐）
    const changeEvent = new Event("change", { bubbles: true, cancelable: true });
    input.dispatchEvent(changeEvent);
    
    // 触发input事件确保Vue响应式系统捕获变更（文档推荐）
    const inputEvent = new Event("input", { bubbles: true });
    input.dispatchEvent(inputEvent);
    
    // 触发fileSelected自定义事件（文档推荐，某些框架可能需要）
    const fileSelectedEvent = new CustomEvent("fileSelected", {
      bubbles: true,
      detail: { files: dataTransfer.files }
    });
    input.dispatchEvent(fileSelectedEvent);
    
    console.log("文件已设置到input，文件数量:", input.files?.length);
    console.log("文件列表:", Array.from(input.files || []).map(f => `${f.name} (${f.size} bytes)`));
    
    // 触发el-upload组件处理（文档建议等待DOM就绪，这里等待50ms后触发）
    setTimeout(() => {
      triggerElUpload(input);
    }, 50);
    
    return true;
  } catch (error) {
    console.error("设置文件到input失败:", error);
    return false;
  }
}

/**
 * 触发el-upload组件的上传处理
 */
function triggerElUpload(input: HTMLInputElement): void {
  try {
    // 查找最近的el-upload容器
    const uploadContainer = input.closest(".el-upload, .el-upload--text, .el-upload-dragger, .el-upload--picture-card");
    if (!uploadContainer) {
      console.warn("未找到el-upload容器");
      return;
    }
    
    console.log("找到el-upload容器:", uploadContainer);
    
    // 查找Vue组件实例（支持Vue 2和Vue 3）
    let vueInstance = null;
    
    // Vue 2
    if ((uploadContainer as any).__vue__) {
      vueInstance = (uploadContainer as any).__vue__;
      console.log("找到Vue 2实例");
    }
    // Vue 3
    else if ((uploadContainer as any).__vueParentComponent) {
      vueInstance = (uploadContainer as any).__vueParentComponent;
      console.log("找到Vue 3实例");
    }
    // 尝试从父元素查找
    else {
      let parent = uploadContainer.parentElement;
      for (let i = 0; i < 5 && parent; i++) {
        if ((parent as any).__vue__) {
          vueInstance = (parent as any).__vue__;
          console.log("从父元素找到Vue 2实例");
          break;
        }
        if ((parent as any).__vueParentComponent) {
          vueInstance = (parent as any).__vueParentComponent;
          console.log("从父元素找到Vue 3实例");
          break;
        }
        parent = parent.parentElement;
      }
    }
    
    if (vueInstance) {
      // Vue 3 Composition API
      if (vueInstance.setupState) {
        const handleFileChange = vueInstance.setupState.handleFileChange || 
                                 vueInstance.setupState.handleChange ||
                                 vueInstance.setupState.onChange;
        if (handleFileChange && typeof handleFileChange === "function") {
          console.log("调用Vue 3 handleFileChange");
          handleFileChange({ target: input });
        }
      }
      
      // Vue 2 Options API 或 Vue 3 Options API
      if (vueInstance.$) {
        const props = vueInstance.$.props || vueInstance.$.attrs;
        const onFileChange = vueInstance.$?.props?.onChange || 
                            vueInstance.$?.attrs?.onChange ||
                            vueInstance.handleFileChange ||
                            vueInstance.handleChange;
        if (onFileChange && typeof onFileChange === "function") {
          console.log("调用Vue组件onChange");
          onFileChange({ target: input });
        }
      }
      
      // 尝试调用组件方法
      if (vueInstance.handleStart && typeof vueInstance.handleStart === "function") {
        console.log("调用handleStart方法");
        vueInstance.handleStart(input.files?.[0]);
      }
      
      if (vueInstance.onChange && typeof vueInstance.onChange === "function") {
        console.log("调用onChange方法");
        vueInstance.onChange({ target: input });
      }
    }
    
    // 再次触发fileSelected事件（确保Vue组件能接收到）
    const fileSelectedEvent2 = new CustomEvent("fileSelected", {
      bubbles: true,
      detail: { files: input.files }
    });
    input.dispatchEvent(fileSelectedEvent2);
    
    // 触发input事件（确保Vue响应式系统更新）
    const inputEvent2 = new Event("input", { bubbles: true });
    (inputEvent2 as any).target = input;
    input.dispatchEvent(inputEvent2);
    
  } catch (error) {
    console.warn("触发el-upload组件处理失败:", error);
  }
}

/**
 * 跳转到下一步
 */
export function goToNextStep(): boolean {
  try {
    // 方法1: 优先查找类型为submit的按钮或primary按钮
    let nextButton = document.querySelector(
      "button.el-button--primary, button[type='submit']"
    ) as HTMLButtonElement;

    // 方法2: 如果没有找到，查找所有按钮并检查文字内容
    if (!nextButton) {
      const buttons = document.querySelectorAll("button");
      for (const button of Array.from(buttons)) {
        const text = button.textContent?.trim() || "";
        if (text.includes("下一步") || text.includes("Next") || text === "下一步") {
          nextButton = button as HTMLButtonElement;
          console.log("通过文字内容找到下一步按钮:", text);
          break;
        }
      }
    }
    
    // 方法3: 如果还是没找到，尝试查找el-button类中的按钮
    if (!nextButton) {
      const elButtons = document.querySelectorAll("button.el-button");
      for (const button of Array.from(elButtons)) {
        const text = button.textContent?.trim() || "";
        if (text.includes("下一步") || text.includes("Next")) {
          nextButton = button as HTMLButtonElement;
          console.log("在el-button中找到下一步按钮:", text);
          break;
        }
      }
    }

    if (nextButton) {
      // 确保按钮可见和可点击
      if (nextButton.offsetParent !== null || nextButton.style.display !== "none") {
        nextButton.click();
        console.log("已点击下一步按钮");
        return true;
      } else {
        console.warn("下一步按钮存在但不可见");
      }
    }
    
    // 方法4: 尝试触发表单提交
    console.warn("未找到下一步按钮，尝试触发表单提交");
    const form = document.querySelector("form");
    if (form) {
      const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
      console.log("已触发表单提交事件");
      return true;
    }
    
    console.error("未找到任何可用的提交方式");
    return false;
  } catch (error) {
    console.error("跳转下一步失败:", error);
    return false;
  }
}

/**
 * 跳转到超时页面
 */
export function redirectToTimeoutPage(): void {
  console.log("30秒超时，跳转到:", TIMEOUT_REDIRECT_URL);
  window.location.href = TIMEOUT_REDIRECT_URL;
}

