// ================== index.js (云端同步版) ==================

// 1. 初始化 Firebase (配置必须与 form.js 一致)
const firebaseConfig = {
    apiKey: "AIzaSyCSU_tYYgsgqUQJZqWai-83yQ5lsjvWqf8",
    authDomain: "fengmao-data.firebaseapp.com",
    projectId: "fengmao-data",
    storageBucket: "fengmao-data.firebasestorage.app",
    messagingSenderId: "241337067399",
    appId: "1:241337067399:web:a23230ce02c4ddbc105522"
};

// 防止重复初始化
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
// 获取数据库实例
const db = firebase.firestore();


// 2. 全局变量
let casesDataArray = [];
let currentFilter = 'all'; // 默认显示全部

// 3. 初始化：页面加载完成后执行 (注意这里加了 async)
document.addEventListener('DOMContentLoaded', async () => {
    
    // A. 读取本地 data.js 数据
    if (typeof ALL_CASES_DATA !== 'undefined') {
        casesDataArray = Object.values(ALL_CASES_DATA);
    } else {
        console.warn("⚠️ 未找到 ALL_CASES_DATA。请确认 data.js 是否正确加载");
        casesDataArray = [];
    }

    // B. 【核心修改】去云端查询哪些案例已完成
    await checkCloudStatus();

    // C. 更新界面
    updateStats();
    renderCases();
});

// ================== 4. 核心功能函数 ==================

/**
 * [新增] 检查云端状态
 * 从 Firebase 下载所有已提交的记录，对比 ID，更新本地状态
 */
async function checkCloudStatus() {
    const listContainer = document.getElementById('casesList');
    const originalText = listContainer.innerHTML;
    
    try {
        // 在数据加载前给个提示（可选）
        console.log("正在同步云端数据...");

        // 1. 获取 ExpertData 集合的所有文档
        const snapshot = await db.collection("ExpertData").get();
        
        // 2. 建立一个“已完成ID”的清单 (Set 查重更快)
        const completedIds = new Set();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.case_id) {
                completedIds.add(data.case_id);
            }
        });

        console.log(`✅ 云端同步完成，共找到 ${completedIds.size} 条已提交记录`);

        // 3. 遍历本地数据，更新状态
        casesDataArray.forEach(item => {
            if (completedIds.has(item.id)) {
                item.status = 'completed'; // 云端有，标记为完成
            } else {
                item.status = 'pending';   // 云端没有，标记为未完成
            }
        });

    } catch (error) {
        console.error("❌ 无法获取云端状态 (可能网络不通)，将显示本地默认状态:", error);
        // 出错时不中断，保持 pending 状态即可
    }
}

/**
 * 渲染案例卡片列表
 */
function renderCases() {
    const listContainer = document.getElementById('casesList');
    const emptyState = document.getElementById('emptyState');
    
    // 清空列表
    listContainer.innerHTML = '';

    // 1. 根据当前过滤器筛选数据
    const filteredCases = casesDataArray.filter(item => {
        if (currentFilter === 'all') return true;
        return item.status === currentFilter;
    });

    // 2. 处理空状态
    if (filteredCases.length === 0) {
        listContainer.style.display = 'none';
        if(emptyState) {
            emptyState.style.display = 'block';
            emptyState.innerHTML = '<p style="color:#999;">暂无数据<br><small>请确认筛选条件或运行 Python 脚本</small></p>';
        }
        return;
    } else {
        listContainer.style.display = 'grid';
        if(emptyState) emptyState.style.display = 'none';
    }

    // 3. 遍历数据生成卡片
    filteredCases.forEach(item => {
        const card = document.createElement('div');
        card.className = 'case-card';
        // 点击跳转
        card.onclick = () => window.location.href = `form.html?id=${item.id}`;

        // 状态样式
        const isCompleted = item.status === 'completed';
        const statusText = isCompleted ? '已完成' : '未完成';
        const statusClass = isCompleted ? 'status-completed' : 'status-pending';

        // 封面图处理
        let coverImgHtml = '';
        if (item.images && item.images.render && item.images.render.length > 0) {
            coverImgHtml = `<img src="${item.images.render[0]}" alt="${item.id}" loading="lazy">`;
        } else {
            coverImgHtml = `<span>${item.id}</span>`;
        }

        card.innerHTML = `
            <span class="card-badge ${statusClass}">${statusText}</span>
            <div class="card-img-placeholder">
                ${coverImgHtml}
            </div>
            <div class="card-body">
                <span class="card-id">${item.id}</span>
                <div class="card-info">类型：${item.type || '-'}</div>
                <div class="card-info">区域：${item.area || '-'}</div>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

/**
 * 切换筛选
 */
function filterCases(filterType) {
    currentFilter = filterType;
    
    // 更新按钮高亮
    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.classList.remove('active');
        // 保持您原有的匹配逻辑
        const btnFilter = btn.getAttribute('data-filter') || 
                          (btn.innerText.includes('全部') ? 'all' : 
                           btn.innerText.includes('已完成') ? 'completed' : 'pending');
        
        if (btnFilter === filterType) {
            btn.classList.add('active');
        }
    });

    renderCases();
}

/**
 * 更新统计数字
 */
function updateStats() {
    const total = casesDataArray.length;
    const completed = casesDataArray.filter(i => i.status === 'completed').length;
    const pending = total - completed;

    const elTotal = document.getElementById('totalCount');
    const elComp = document.getElementById('completedCount');
    const elPend = document.getElementById('pendingCount');

    if(elTotal) elTotal.innerText = total;
    if(elComp) elComp.innerText = completed;
    if(elPend) elPend.innerText = pending;
}