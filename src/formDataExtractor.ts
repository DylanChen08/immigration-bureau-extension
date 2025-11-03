// 表单数据提取模块 - 从成功页面提取所有信息

/**
 * 提取二维码图片的base64
 * @returns base64字符串或Promise（如果异步加载）
 */
function extractQrCodeBase64(): string | null | Promise<string | null> {
  try {
    // 查找二维码元素
    const qrCodeElement = document.querySelector("#app > div > div.main > div > div.info-content > ul > li.line-qr-code > div");
    
    if (!qrCodeElement) {
      console.warn("未找到二维码元素");
      return null;
    }
    
    // 尝试查找二维码图片
    let imgElement: HTMLImageElement | null = null;
    
    // 方法1: 在二维码容器内查找img标签
    imgElement = qrCodeElement.querySelector("img") as HTMLImageElement;
    
    // 方法2: 如果没找到，查找canvas并转换
    if (!imgElement) {
      const canvas = qrCodeElement.querySelector("canvas") as HTMLCanvasElement;
      if (canvas) {
        try {
          const base64 = canvas.toDataURL("image/png");
          console.log("从canvas提取二维码base64");
          return base64;
        } catch (e) {
          console.warn("canvas转base64失败:", e);
        }
      }
    }
    
    // 方法3: 如果是SVG，转换为base64
    if (!imgElement) {
      const svg = qrCodeElement.querySelector("svg");
      if (svg) {
        try {
          const svgData = new XMLSerializer().serializeToString(svg);
          const base64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
          console.log("从SVG提取二维码base64");
          return base64;
        } catch (e) {
          console.warn("SVG转base64失败:", e);
        }
      }
    }
    
    // 如果找到img，获取src（可能是base64或URL）
    if (imgElement && imgElement.src) {
      // 如果src是base64格式，直接返回
      if (imgElement.src.startsWith("data:image")) {
        console.log("从img src提取二维码base64");
        return imgElement.src;
      }
      
      // 如果是URL，需要异步加载图片再转换为base64
      // 返回Promise，调用方需要处理异步情况
      return loadImageAsBase64(imgElement.src);
    }
    
    console.warn("无法提取二维码base64");
    return null;
  } catch (error) {
    console.error("提取二维码失败:", error);
    return null;
  }
}

/**
 * 加载图片URL并转换为base64
 */
function loadImageAsBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL("image/png");
          resolve(base64);
        } else {
          resolve(null);
        }
      } catch (e) {
        console.error("图片转base64失败:", e);
        resolve(null);
      }
    };
    
    img.onerror = () => {
      console.error("加载图片失败:", url);
      resolve(null);
    };
    
    img.src = url;
  });
}

/**
 * 从页面提取表单数据（同步版本，二维码异步处理）
 * 直接从 ul li 结构提取，不依赖字段名，支持中英文
 */
export function extractFormData(): {
  [key: string]: any;
  qrcode?: string;
} | null {
  try {
    const formData: { [key: string]: any } = {};
    
    // 查找信息容器
    const infoContent = document.querySelector("#app > div > div.main > div > div.info-content");
    if (!infoContent) {
      console.warn("未找到信息容器");
      return null;
    }
    
    // 查找所有li元素（跳过二维码li）
    const listItems = infoContent.querySelectorAll("ul > li:not(.line-qr-code)");
    
    listItems.forEach((li, index) => {
      try {
        // 方法1: 直接查找 span 和 div（标准结构：<li><span>标签</span><div>值</div></li>）
        const spanElement = li.querySelector("span");
        const divElement = li.querySelector("div");
        
        if (spanElement && divElement) {
          const label = spanElement.textContent?.trim() || "";
          const value = divElement.textContent?.trim() || "";
          
          if (value) {
            // 使用索引作为key（field0, field1, field2...），同时保留原始标签
            const key = `field${index}`;
            formData[key] = value;
            // 同时保存标签信息（用于调试）
            formData[`${key}_label`] = label;
          }
        } else {
          // 方法2: 如果结构不同，尝试提取所有文本
          const allText = li.textContent?.trim() || "";
          if (allText) {
            const key = `field${index}`;
            formData[key] = allText;
          }
        }
      } catch (e) {
        console.warn(`提取列表项 ${index} 数据失败:`, e);
      }
    });
    
    console.log(`提取到 ${listItems.length} 个字段`);
    console.log("提取的表单数据（不含二维码）:", formData);
    
    // 提取二维码base64（同步提取，如果是URL需要异步处理）
    const qrcode = extractQrCodeBase64();
    if (qrcode) {
      // 如果是Promise（异步加载），先设置为null，后续异步更新
      if (qrcode instanceof Promise) {
        console.warn("二维码需要异步加载，先发送其他数据");
        // 异步加载二维码
        qrcode.then(base64 => {
          if (base64) {
            formData.qrcode = base64;
            console.log("二维码已异步加载，可以重新发送数据");
          }
        });
      } else {
        formData.qrcode = qrcode;
      }
    } else {
      console.warn("未能提取二维码，但继续发送其他数据");
    }
    
    return Object.keys(formData).length > 0 ? formData : null;
  } catch (error) {
    console.error("提取表单数据失败:", error);
    return null;
  }
}

/**
 * 将中文标签映射为英文key
 */
function mapChineseToEnglish(chineseLabel: string): string | null {
  const mapping: { [key: string]: string } = {
    "姓名": "name",
    "名字": "name",
    "name": "name",
    "年龄": "age",
    "岁数": "age",
    "age": "age",
    "部门": "dep",
    "department": "dep",
    "dep": "dep",
    "证件号": "idNumber",
    "身份证": "idNumber",
    "护照号": "passportNumber",
    "手机号": "phone",
    "电话": "phone",
    "邮箱": "email",
    "地址": "address",
    "国籍": "nationality",
    "性别": "gender",
    "sex": "gender",
    "出生日期": "birthdate",
    "生日": "birthdate",
    "入境日期": "entryDate",
    "出境日期": "exitDate",
  };
  
  // 尝试精确匹配
  if (mapping[chineseLabel]) {
    return mapping[chineseLabel];
  }
  
  // 尝试包含匹配
  for (const [key, value] of Object.entries(mapping)) {
    if (chineseLabel.includes(key) || key.includes(chineseLabel)) {
      return value;
    }
  }
  
  return null;
}

