// ================= 1. 连接 Firebase (已配置好您的密钥) =================

// 这里是您生成的配置
const firebaseConfig = {
    apiKey: "AIzaSyCSU_tYYgsgqUQJZqWai-83yQ5lsjvWqf8",
    authDomain: "fengmao-data.firebaseapp.com",
    projectId: "fengmao-data",
    storageBucket: "fengmao-data.firebasestorage.app",
    messagingSenderId: "241337067399",
    appId: "1:241337067399:web:a23230ce02c4ddbc105522"
};

// 初始化连接 (使用 Compat 模式)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 获取数据库实例
const db = firebase.firestore();

// ================= 2. 评分联动逻辑 (均值精确到0.05) =================

function updateScore(categoryName) {
    // 找到该组下的所有滑块
    const inputs = document.querySelectorAll(`#group_${categoryName} input[type="range"]`);
    
    let total = 0;
    let count = 0;

    inputs.forEach(input => {
        const val = parseFloat(input.value);
        // 找到滑块旁边的数字显示
        const displaySpan = document.getElementById('val_' + input.name);
        if(displaySpan) {
            displaySpan.innerText = val.toFixed(1); 
        }
        total += val;
        count++;
    });

    // 计算均值并特殊舍入
    const rawAverage = count > 0 ? (total / count) : 0;
    const refinedScore = Math.round(rawAverage / 0.05) * 0.05;

    // 更新大类总分
    const totalDisplay = document.getElementById(`score_${categoryName}_total`);
    if(totalDisplay) {
        totalDisplay.innerText = refinedScore.toFixed(2);
    }
}

// ================= 3. 交互逻辑：特征描述与合规性拆解 =================

// --- A. 风貌特征描述逻辑 ---
function toggleFeatureInput() {
    const radioNo = document.querySelector('input[name="featureAgree"][value="no"]');
    if (!radioNo) return; 

    const isNo = radioNo.checked;
    const inputArea = document.getElementById('featureInputArea');
    const textArea = document.getElementById('featureEditable');

    if(inputArea) {
        inputArea.style.display = isNo ? 'block' : 'none';
    }

    if (isNo) {
        const aiFeatureDiv = document.getElementById('aiFeatureText');
        if (aiFeatureDiv && textArea && (!textArea.value || textArea.value.trim() === "")) {
            textArea.value = aiFeatureDiv.innerText.trim();
        }
    }
}

// --- B. 合规性研判逻辑 ---

function parseAiCompliance(fullText) {
    const result = {
        color: "未读取到色彩合规性内容",
        material: "未读取到材质合规性内容",
        style: "未读取到风格合规性内容",
        facade: "未读取到立面合规性内容",
        volume: "未读取到体量合规性内容"
    };

    if (!fullText) return result;

    const patterns = [
        { key: 'color', start: /1\.色彩合规性/i, end: /2\.材质合规性/i },
        { key: 'material', start: /2\.材质合规性/i, end: /3\.风格合规性/i },
        { key: 'style', start: /3\.风格合规性/i, end: /4\.立面合规性/i },
        { key: 'facade', start: /4\.立面合规性/i, end: /5\.体量合规性/i },
        { key: 'volume', start: /5\.体量合规性/i, end: /$/ }
    ];

    patterns.forEach(p => {
        const matchStart = fullText.search(p.start);
        if (matchStart !== -1) {
            let content = "";
            const matchEnd = fullText.search(p.end);
            
            if (matchEnd !== -1) {
                const sectionRaw = fullText.substring(matchStart, matchEnd);
                const firstLineBreak = sectionRaw.indexOf('\n');
                if (firstLineBreak !== -1) {
                    content = sectionRaw.substring(firstLineBreak).trim();
                } else {
                    content = sectionRaw.replace(p.start, '').trim();
                }
            }
            if (content) result[p.key] = content;
        }
    });

    return result;
}

function toggleComplianceInput() {
    const radioNo = document.querySelector('input[name="complianceAgree"][value="no"]');
    if (!radioNo) return;

    const isNo = radioNo.checked;
    const inputArea = document.getElementById('complianceInputArea');
    
    if(inputArea) {
        inputArea.style.display = isNo ? 'block' : 'none';
    }
    
    if (isNo) {
        const aiContentDiv = document.getElementById('aiComplianceText');
        const fullText = aiContentDiv ? aiContentDiv.innerText : "";
        const parts = parseAiCompliance(fullText);

        ['color', 'material', 'style', 'facade', 'volume'].forEach(key => {
            const viewEl = document.getElementById(`view_${key}`);
            const editEl = document.getElementById(`edit_${key}`);
            if (viewEl) viewEl.innerText = parts[key];
            if (editEl && (!editEl.value || editEl.value.trim() === "")) {
                editEl.value = parts[key];
            }
        });
    }
}

function toggleSubItem(key) {
    const radioModify = document.querySelector(`input[name="comp_${key}_agree"][value="no"]`);
    if (!radioModify) return;

    const isModify = radioModify.checked;
    const viewEl = document.getElementById(`view_${key}`);
    const editEl = document.getElementById(`edit_${key}`);

    if (isModify) {
        if (viewEl) viewEl.style.display = 'none';
        if (editEl) {
            editEl.style.display = 'block';
            editEl.focus();
        }
    } else {
        if (viewEl) viewEl.style.display = 'block';
        if (editEl) editEl.style.display = 'none';
        
        const aiContentDiv = document.getElementById('aiComplianceText');
        if (aiContentDiv && viewEl) {
            const parts = parseAiCompliance(aiContentDiv.innerText);
            viewEl.innerText = parts[key]; 
        }
    }
}

// ================= 4. 数据注入与初始化 =================

function fillImages(containerId, imgList) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; 

    if (imgList && imgList.length > 0) {
        imgList.forEach(src => {
            const img = document.createElement('img');
            img.src = src;
            img.onclick = () => window.open(src, '_blank');
            container.appendChild(img);
        });
    } else {
        container.innerHTML = '<div class="placeholder-text">无图片</div>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 绑定事件
    document.body.addEventListener('change', (e) => {
        if (e.target.type === 'radio') {
            if (e.target.name === 'featureAgree') toggleFeatureInput();
            if (e.target.name === 'complianceAgree') toggleComplianceInput();
            if (e.target.name.startsWith('comp_') && e.target.name.endsWith('_agree')) {
                const parts = e.target.name.split('_'); 
                if (parts.length === 3) toggleSubItem(parts[1]);
            }
        }
    });

    // 初始化评分
    updateScore('coordination');
    updateScore('continuity');
    updateScore('innovation');

    // 数据注入
    const urlParams = new URLSearchParams(window.location.search);
    const caseId = urlParams.get('id');

    if (caseId && typeof ALL_CASES_DATA !== 'undefined' && ALL_CASES_DATA[caseId]) {
        const data = ALL_CASES_DATA[caseId];

        const caseHeader = document.getElementById('caseIdDisplay');
        if(caseHeader) caseHeader.innerText = `案例ID: ${data.id}`;
        
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

        const elAiFeature = document.getElementById('aiFeatureText');
        if(elAiFeature) elAiFeature.innerText = data.ai_description;

        const elAiCompliance = document.getElementById('aiComplianceText');
        if(elAiCompliance) elAiCompliance.innerText = data.ai_compliance;

        fillImages('img_render', data.images.render);
        fillImages('img_collage', data.images.collage);
        fillImages('img_volume', data.images.volume);

    } else {
        console.warn("未找到该案例数据，或未运行Python脚本！");
    }
});

// ================= 5. 数据校验与收集 =================

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

    if (!isValid) {
        alert("提交失败，请完善以下信息：\n\n" + errorMsg.join("\n"));
    }

    return isValid;
}

function collectFormData() {
    const urlParams = new URLSearchParams(window.location.search);
    const caseId = urlParams.get('id') || "UnknownID";
    const timestamp = new Date().toISOString();

    const featureAgree = document.querySelector('input[name="featureAgree"]:checked')?.value;
    const featureContent = (featureAgree === 'no') 
        ? document.getElementById('featureEditable').value 
        : document.getElementById('aiFeatureText').innerText; 

    const complianceData = {
        overall_agree: document.querySelector('input[name="complianceAgree"]:checked')?.value
    };
    
    ['color', 'material', 'style', 'facade', 'volume'].forEach(key => {
        const subAgree = document.querySelector(`input[name="comp_${key}_agree"]:checked`)?.value;
        let finalContent = "";
        if (subAgree === 'no') {
            finalContent = document.getElementById(`edit_${key}`)?.value || "";
        } else {
            finalContent = document.getElementById(`view_${key}`)?.innerText || "";
        }
        complianceData[key] = { agree: subAgree, content: finalContent };
    });

    const scores = {};
    const categories = ['coordination', 'continuity', 'innovation'];
    const subItems = ['color', 'material', 'style', 'facade', 'volume'];

    categories.forEach(cat => {
        scores[cat] = { sub_items: {} };
        subItems.forEach(sub => {
            const slider = document.querySelector(`input[name="${cat}_${sub}"]`);
            const reasonBox = slider ? slider.nextElementSibling : null; 
            if (slider) {
                scores[cat].sub_items[sub] = {
                    score: slider.value,
                    reason: reasonBox ? reasonBox.value : ""
                };
            }
        });
        const totalSpan = document.getElementById(`score_${cat}_total`);
        if (totalSpan) scores[cat].average = totalSpan.innerText;
    });

    const suggestion = document.querySelector('textarea[name="optimizationSuggestion"]')?.value || "";
    const conclusion = document.querySelector('input[name="finalConclusion"]:checked')?.value || "";

    return {
        case_id: caseId,
        submit_time: timestamp,
        data: {
            feature_check: { agree: featureAgree, final_text: featureContent },
            compliance_check: complianceData,
            quality_scores: scores,
            optimization: suggestion,
            conclusion: conclusion
        }
    };
}

// ================= 6. 云端提交逻辑 (无草稿功能) =================

document.addEventListener('DOMContentLoaded', () => {
    
    const form = document.getElementById('expertForm');
    
    // 【提交完成】按钮 -> 上传到 Firebase
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault(); 

            // 1. 校验
            if (!validateForm()) return;

            // 2. 界面反馈
            const submitBtn = document.querySelector('.submit-btn');
            const originalText = submitBtn.innerText;
            submitBtn.disabled = true;
            submitBtn.innerText = "⏳ 正在上传云端...";
            submitBtn.style.backgroundColor = "#ccc";
            submitBtn.style.cursor = "not-allowed";

            // 3. 收集数据
            const data = collectFormData();

            // 4. 上传到 Firebase
            try {
                await db.collection("ExpertData").add(data);
                
                alert("✅ 提交成功！\n数据已安全保存到云端数据库。");
                window.location.href = 'index.html';

            } catch (error) {
                console.error("上传失败:", error);
                alert("❌ 上传失败，请检查网络。\n错误信息: " + error.message);
                
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
                submitBtn.style.backgroundColor = ""; 
                submitBtn.style.cursor = "pointer";
            }
        });
    }
});