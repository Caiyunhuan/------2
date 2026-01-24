// ================== index.js (纯净版) ==================

// 1. 全局变量：用于存储从 data.js 读取到的真实数据
let casesDataArray = [];
let currentFilter = 'all'; // 默认显示全部

// 2. 初始化：页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 尝试读取 ALL_CASES_DATA (来自 data.js)
    if (typeof ALL_CASES_DATA !== 'undefined') {
        // 将对象转换为数组 (例如: {A0001: {...}, A0002: {...}} -> [ {...}, {...} ])
        casesDataArray = Object.values(ALL_CASES_DATA);
        console.log(`✅ 成功加载 ${casesDataArray.length} 条真实案例数据`);
    } else {
        console.warn("⚠️ 未找到 ALL_CASES_DATA。请确认：\n1. Python脚本已运行并生成了 data.js\n2. index.html 中已正确引入 data.js");
        casesDataArray = [];
    }

    // 更新界面
    updateStats();
    renderCases();
});

// ================== 3. 核心功能函数 ==================

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
        // Python脚本生成的默认状态是 "pending" (未完成)
        return item.status === currentFilter;
    });

    // 2. 处理空状态 (没有数据时显示提示)
    if (filteredCases.length === 0) {
        listContainer.style.display = 'none';
        if(emptyState) {
            emptyState.style.display = 'block';
            // 修改提示文字，去掉之前的“添加示例”按钮
            emptyState.innerHTML = '<p style="color:#999;">暂无数据<br><small>请运行 Python 脚本生成数据</small></p>';
        }
        return;
    } else {
        listContainer.style.display = 'grid';
        if(emptyState) emptyState.style.display = 'none';
    }

    // 3. 遍历数据生成卡片 HTML
    filteredCases.forEach(item => {
        const card = document.createElement('div');
        card.className = 'case-card';
        // 点击卡片跳转到详情页，并带上 ?id=xxx
        card.onclick = () => window.location.href = `form.html?id=${item.id}`;

        // 状态标签样式
        const isCompleted = item.status === 'completed';
        const statusText = isCompleted ? '已完成' : '未完成';
        const statusClass = isCompleted ? 'status-completed' : 'status-pending';

        // 获取封面图 (优先取 render 文件夹里的第一张)
        let coverImgHtml = '';
        if (item.images && item.images.render && item.images.render.length > 0) {
            // 使用真实图片路径
            coverImgHtml = `<img src="${item.images.render[0]}" alt="${item.id}" loading="lazy">`;
        } else {
            // 没有图片时显示占位
            coverImgHtml = `<span>${item.id}</span>`;
        }

        // 填充卡片内容
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
 * 切换筛选 (全部 / 未完成 / 已完成)
 */
function filterCases(filterType) {
    currentFilter = filterType;
    
    // 更新按钮高亮状态
    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.classList.remove('active');
        // 简单的匹配逻辑：根据按钮上的文字或onclick内容判断
        // 为了准确，建议您在HTML按钮上加上 id 或 data-filter 属性
        // 这里使用更通用的方式：
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
 * 更新顶部的统计数字
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