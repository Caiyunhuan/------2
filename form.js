// ================= 1. 评分联动逻辑 (均值精确到0.05) =================

function updateScore(categoryName) {
    // 找到该组下的所有滑块 (确保HTML里ID命名正确)
    const inputs = document.querySelectorAll(`#group_${categoryName} input[type="range"]`);
    
    let total = 0;
    let count = 0;

    inputs.forEach(input => {
        // 解析浮点数 (滑块本身是 0.0 - 1.0, 步长 0.1)
        const val = parseFloat(input.value);
        
        // 找到滑块旁边的数字显示 (ID: val_name)
        const displaySpan = document.getElementById('val_' + input.name);
        if(displaySpan) {
            displaySpan.innerText = val.toFixed(1); 
        }
        
        total += val;
        count++;
    });

    // 1. 计算原始平均值
    const rawAverage = count > 0 ? (total / count) : 0;

    // 2. 特殊舍入逻辑：精确到 0.05
    // 公式原理：先除以0.05，四舍五入取整，再乘回0.05
    const refinedScore = Math.round(rawAverage / 0.05) * 0.05;

    // 更新大类总分显示
    const totalDisplay = document.getElementById(`score_${categoryName}_total`);
    if(totalDisplay) {
        // 使用 toFixed(2) 确保显示两位小数，例如 0.80, 0.85
        totalDisplay.innerText = refinedScore.toFixed(2);
    }
}

// ================= 2. 交互逻辑：特征描述与合规性拆解 =================

// --- A. 风貌特征描述逻辑 ---
function toggleFeatureInput() {
    const radioNo = document.querySelector('input[name="featureAgree"][value="no"]');
    if (!radioNo) return; 

    const isNo = radioNo.checked;
    const inputArea = document.getElementById('featureInputArea');
    const textArea = document.getElementById('featureEditable'); // 专家修改的输入框

    if(inputArea) {
        inputArea.style.display = isNo ? 'block' : 'none';
    }

    // [逻辑] 选“否”时，将左侧 AI 生成的特征描述填入右侧输入框
    if (isNo) {
        const aiFeatureDiv = document.getElementById('aiFeatureText'); // 左侧 AI 内容
        // 仅当输入框为空时才填充，防止覆盖专家已修改的内容
        if (aiFeatureDiv && textArea && (!textArea.value || textArea.value.trim() === "")) {
            textArea.value = aiFeatureDiv.innerText.trim();
        }
    }
}

// --- B. 合规性研判逻辑 (核心解析算法) ---

/**
 * 解析函数：将一段完整的 AI 合规研判文本，拆解为 5 个部分
 * 修正说明：移除了无效的正则对象比较，直接使用 search()，因为 search(/$/) 会自动返回字符串长度。
 */
function parseAiCompliance(fullText) {
    const result = {
        color: "未读取到色彩合规性内容",
        material: "未读取到材质合规性内容",
        style: "未读取到风格合规性内容",
        facade: "未读取到立面合规性内容",
        volume: "未读取到体量合规性内容"
    };

    if (!fullText) return result;

    // 定义正则匹配规则
    const patterns = [
        { key: 'color', start: /1\.色彩合规性/i, end: /2\.材质合规性/i },
        { key: 'material', start: /2\.材质合规性/i, end: /3\.风格合规性/i },
        { key: 'style', start: /3\.风格合规性/i, end: /4\.立面合规性/i },
        { key: 'facade', start: /4\.立面合规性/i, end: /5\.体量合规性/i },
        { key: 'volume', start: /5\.体量合规性/i, end: /$/ } // $ 表示文本结束
    ];

    patterns.forEach(p => {
        const matchStart = fullText.search(p.start);
        if (matchStart !== -1) {
            let content = "";
            
            // 【修正处】直接使用 search(p.end)
            // 如果 p.end 是 /$/，search 会返回 fullText.length，逻辑完全正确
            // 如果 p.end 是中间的标题且没找到，会返回 -1，后续 if 判断会处理
            const matchEnd = fullText.search(p.end);
            
            // 只要找到了结束位置（或者结束位置是字符串末尾）
            if (matchEnd !== -1) {
                // 截取片段
                const sectionRaw = fullText.substring(matchStart, matchEnd);
                
                // 去掉第一行标题 (例如 "1.色彩合规性")
                const firstLineBreak = sectionRaw.indexOf('\n');
                if (firstLineBreak !== -1) {
                    content = sectionRaw.substring(firstLineBreak).trim();
                } else {
                    // 如果没有换行，直接替换掉标题文字
                    content = sectionRaw.replace(p.start, '').trim();
                }
            }
            
            if (content) result[p.key] = content;
        }
    });

    return result;
}

// 监听合规性研判的主开关 (同意/否)
function toggleComplianceInput() {
    const radioNo = document.querySelector('input[name="complianceAgree"][value="no"]');
    if (!radioNo) return;

    const isNo = radioNo.checked;
    const inputArea = document.getElementById('complianceInputArea'); // 包裹5个子项的容器
    
    if(inputArea) {
        inputArea.style.display = isNo ? 'block' : 'none';
    }
    
    // [核心逻辑] 如果选“否”，触发解析并填充 5 个子项
    if (isNo) {
        const aiContentDiv = document.getElementById('aiComplianceText');
        const fullText = aiContentDiv ? aiContentDiv.innerText : "";
        
        // 1. 调用解析函数
        const parts = parseAiCompliance(fullText);

        // 2. 遍历填充 5 个方面
        ['color', 'material', 'style', 'facade', 'volume'].forEach(key => {
            const viewEl = document.getElementById(`view_${key}`);
            const editEl = document.getElementById(`edit_${key}`);
            
            // 填充只读视图
            if (viewEl) viewEl.innerText = parts[key];
            
            // 填充编辑框 (仅当为空时，避免覆盖用户修改)
            if (editEl && (!editEl.value || editEl.value.trim() === "")) {
                editEl.value = parts[key];
            }
        });
    }
}

// 监听 5 个子项的独立开关 (同意/修改)
function toggleSubItem(key) {
    const radioModify = document.querySelector(`input[name="comp_${key}_agree"][value="no"]`);
    if (!radioModify) return;

    const isModify = radioModify.checked;
    const viewEl = document.getElementById(`view_${key}`);
    const editEl = document.getElementById(`edit_${key}`);

    if (isModify) {
        // 修改模式：隐藏只读文本，显示输入框
        if (viewEl) viewEl.style.display = 'none';
        if (editEl) {
            editEl.style.display = 'block';
            editEl.focus(); // 自动聚焦
        }
    } else {
        // 同意模式：显示只读文本，隐藏输入框
        if (viewEl) viewEl.style.display = 'block';
        if (editEl) editEl.style.display = 'none';
        
        // 体验优化：切回“同意”时，重置回 AI 原文 (可选)
        const aiContentDiv = document.getElementById('aiComplianceText');
        if (aiContentDiv && viewEl) {
            const parts = parseAiCompliance(aiContentDiv.innerText);
            viewEl.innerText = parts[key]; 
        }
    }
}

// ================= 3. 数据注入与初始化 =================

// 辅助函数：填充图片
function fillImages(containerId, imgList) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; 

    if (imgList && imgList.length > 0) {
        imgList.forEach(src => {
            const img = document.createElement('img');
            img.src = src;
            img.onclick = () => window.open(src, '_blank'); // 点击查看大图
            container.appendChild(img);
        });
    } else {
        container.innerHTML = '<div class="placeholder-text">无图片</div>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. 绑定所有单选框事件 (主开关 + 子开关)
    // 使用事件委托或直接绑定所有 radio
    document.body.addEventListener('change', (e) => {
        if (e.target.type === 'radio') {
            if (e.target.name === 'featureAgree') toggleFeatureInput();
            if (e.target.name === 'complianceAgree') toggleComplianceInput();
            // 子项开关监听 (name="comp_color_agree" 等)
            if (e.target.name.startsWith('comp_') && e.target.name.endsWith('_agree')) {
                // 提取 key (例如 comp_color_agree -> color)
                const parts = e.target.name.split('_'); 
                if (parts.length === 3) {
                    toggleSubItem(parts[1]);
                }
            }
        }
    });

    // 2. 初始化评分显示
    updateScore('coordination');
    updateScore('continuity');
    updateScore('innovation');

    // 3. 数据注入 (从 URL 获取 ID 并读取 data.js)
    const urlParams = new URLSearchParams(window.location.search);
    const caseId = urlParams.get('id');

    // 检查 ALL_CASES_DATA 是否存在 (由 data.js 提供)
    if (caseId && typeof ALL_CASES_DATA !== 'undefined' && ALL_CASES_DATA[caseId]) {
        const data = ALL_CASES_DATA[caseId];

        // 填充头部 ID
        const caseHeader = document.getElementById('caseIdDisplay');
        if(caseHeader) caseHeader.innerText = `案例ID: ${data.id}`;
        
        // 填充左侧信息 (根据新拆分的结构)
        const elID = document.getElementById('docID');
        if(elID) elID.innerHTML = `<p>${data.id}</p>`;

        const elType = document.getElementById('docType');
        if(elType) elType.innerHTML = `<p>${data.type}</p>`;

        const elArea = document.getElementById('docArea');
        if(elArea) elArea.innerHTML = `<p>${data.area}</p>`;

        const elRegulations = document.getElementById('docRegulations');
        if(elRegulations) elRegulations.innerText = data.regulations;

        const elFeatures = document.getElementById('docFeatures');
        if(elFeatures) elFeatures.innerText = data.features;

        // 填充 AI 生成内容
        const elAiFeature = document.getElementById('aiFeatureText');
        if(elAiFeature) elAiFeature.innerText = data.ai_description;

        const elAiCompliance = document.getElementById('aiComplianceText');
        if(elAiCompliance) elAiCompliance.innerText = data.ai_compliance;

        // 填充图片
        fillImages('img_render', data.images.render);
        fillImages('img_collage', data.images.collage);
        fillImages('img_volume', data.images.volume);

    } else {
        console.warn("未找到该案例数据，或未运行Python脚本！(URL参数应包含 ?id=...)");
    }
});

// 返回功能
function goBack() {
    window.location.href = 'index.html';
}

// ================= 4. 数据保存与下载模块 (带校验功能) =================

/**
 * [新增] 校验函数：检查必填项逻辑
 * 返回 true 表示通过，false 表示失败
 */
function validateForm() {
    let isValid = true;
    let errorMsg = [];

    // 1. 检查【风貌特征描述】
    const featureAgree = document.querySelector('input[name="featureAgree"]:checked');
    if (!featureAgree) {
        isValid = false;
        errorMsg.push("🔴 [1. 风貌特征描述] 未选择“同意”或“否”");
    } else if (featureAgree.value === 'no') {
        const featureText = document.getElementById('featureEditable').value.trim();
        if (!featureText) {
            isValid = false;
            errorMsg.push("🔴 [1. 风貌特征描述] 您选择了“否”，请填写修改意见");
        }
    }

    // 2. 检查【合规性综合判断】
    const complianceAgree = document.querySelector('input[name="complianceAgree"]:checked');
    if (!complianceAgree) {
        isValid = false;
        errorMsg.push("🔴 [2. 合规性综合判断] 未选择“同意”或“否”");
    } else if (complianceAgree.value === 'no') {
        // 如果大类选了否，必须检查 5 个子项
        const subMap = {'color': '色彩', 'material': '材质', 'style': '风格', 'facade': '立面', 'volume': '体量'};
        
        for (let key in subMap) {
            const subAgree = document.querySelector(`input[name="comp_${key}_agree"]:checked`);
            if (!subAgree) {
                isValid = false;
                errorMsg.push(`🔴 [2. 合规性-${subMap[key]}] 未进行确认`);
            } else if (subAgree.value === 'no') {
                const subText = document.getElementById(`edit_${key}`).value.trim();
                if (!subText) {
                    isValid = false;
                    errorMsg.push(`🔴 [2. 合规性-${subMap[key]}] 选择了“修改”但未填写内容`);
                }
            }
        }
    }

    // 3. 检查【最终结论】
    const conclusion = document.querySelector('input[name="finalConclusion"]:checked');
    if (!conclusion) {
        isValid = false;
        errorMsg.push("🔴 [5. 最终结论] 未选择“通过”或“不通过”");
    }

    // 4. (可选) 检查优化建议是否为空，如果必须填请取消下面注释
    /*
    const suggestion = document.querySelector('textarea[name="optimizationSuggestion"]').value.trim();
    if (!suggestion) {
        isValid = false;
        errorMsg.push("🔴 [4. 优化建议] 不能为空");
    }
    */

    // 如果有错误，弹窗提示
    if (!isValid) {
        alert("提交失败，请完善以下信息：\n\n" + errorMsg.join("\n"));
    }

    return isValid;
}

/**
 * 核心功能：收集页面上所有的填写数据
 */
function collectFormData() {
    // 1. 获取基础信息
    const urlParams = new URLSearchParams(window.location.search);
    const caseId = urlParams.get('id') || "UnknownID";
    const timestamp = new Date().toISOString();

    // 2. 收集【风貌特征】数据
    const featureAgree = document.querySelector('input[name="featureAgree"]:checked')?.value;
    const featureContent = (featureAgree === 'no') 
        ? document.getElementById('featureEditable').value 
        : document.getElementById('aiFeatureText').innerText; // 如果同意，保存AI原文

    // 3. 收集【合规性研判】数据 (含5个分项)
    const complianceData = {
        overall_agree: document.querySelector('input[name="complianceAgree"]:checked')?.value
    };
    
    // 遍历 5 个子项 (色彩、材质、风格、立面、体量)
    ['color', 'material', 'style', 'facade', 'volume'].forEach(key => {
        // 获取子项的同意状态 (yes/no)
        const subAgree = document.querySelector(`input[name="comp_${key}_agree"]:checked`)?.value;
        
        let finalContent = "";
        if (subAgree === 'no') {
            // 如果选"修改"，取文本框里的内容
            finalContent = document.getElementById(`edit_${key}`)?.value || "";
        } else {
            // 如果选"同意"，取只读区域的 AI 原文
            finalContent = document.getElementById(`view_${key}`)?.innerText || "";
        }

        complianceData[key] = {
            agree: subAgree,
            content: finalContent
        };
    });

    // 4. 收集【评分】数据
    const scores = {};
    const categories = ['coordination', 'continuity', 'innovation'];
    const subItems = ['color', 'material', 'style', 'facade', 'volume'];

    categories.forEach(cat => {
        scores[cat] = { sub_items: {} };
        
        // 收集该大类下的 5 个小指标
        subItems.forEach(sub => {
            const slider = document.querySelector(`input[name="${cat}_${sub}"]`);
            // 找到滑块对应的"原因"文本框
            const reasonBox = slider ? slider.nextElementSibling : null; 
            
            if (slider) {
                scores[cat].sub_items[sub] = {
                    score: slider.value,
                    reason: reasonBox ? reasonBox.value : ""
                };
            }
        });

        // 收集该大类的计算均值
        const totalSpan = document.getElementById(`score_${cat}_total`);
        if (totalSpan) {
            scores[cat].average = totalSpan.innerText;
        }
    });

    // 5. 收集【优化建议】与【最终结论】
    const suggestion = document.querySelector('textarea[name="optimizationSuggestion"]')?.value || "";
    const conclusion = document.querySelector('input[name="finalConclusion"]:checked')?.value || "";

    // 6. 组装最终对象
    return {
        case_id: caseId,
        submit_time: timestamp,
        data: {
            feature_check: {
                agree: featureAgree,
                final_text: featureContent
            },
            compliance_check: complianceData,
            quality_scores: scores,
            optimization: suggestion,
            conclusion: conclusion
        }
    };
}

/**
 * 通用函数：触发浏览器下载
 */
function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }, 100);
}

// ================= 事件绑定 (在页面底部统一管理) =================

// 注意：这里我们不需要再写一遍 DOMContentLoaded，因为原来的 Section 3 已经有了。
// 但是为了防止事件没有绑定上，我们把绑定逻辑封装，并确保在页面加载后执行。

// 为了保险起见，直接追加这个监听器，它会独立运行，不会冲突。
document.addEventListener('DOMContentLoaded', () => {
    
    // 绑定【提交完成】按钮
    const form = document.getElementById('expertForm');
    if (form) {
        // 先移除可能存在的旧监听器（防止重复提交，但在原生JS里很难移除匿名函数，所以我们依靠逻辑控制）
        // 这里的逻辑是新的：
        form.addEventListener('submit', function(e) {
            e.preventDefault(); // 阻止页面默认刷新
            
            // 1. 【新增步骤】先进行校验
            if (!validateForm()) {
                return; // 如果校验不通过，直接停止，不下载
            }

            // 2. 校验通过，开始收集和下载
            const data = collectFormData();
            const jsonStr = JSON.stringify(data, null, 4);
            
            // 下载文件名: A0001_专家打分_时间.json
            const dateStr = new Date().toISOString().slice(0,10);
            downloadFile(`${data.case_id}_提交数据_${dateStr}.json`, jsonStr);
            
            alert("✅ 提交成功！\n数据文件已开始下载，请将其发送给管理员。");
        });
    }

    // 绑定【保存草稿】按钮 (草稿通常不需要严格校验)
    const saveBtn = document.querySelector('.save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            const data = collectFormData();
            const jsonStr = JSON.stringify(data, null, 4);
            
            downloadFile(`${data.case_id}_草稿.json`, jsonStr);
            alert("💾 草稿已保存到您的本地下载文件夹。");
        });
    }
});