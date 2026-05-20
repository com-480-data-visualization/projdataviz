/**
 * 市场集中度分析模块 (Market Concentration Component)
 * 纯 D3.js 绘图逻辑，完美解耦，支持 5 种垂直茶饮品类数据
 */
import * as d3 from 'd3';
let bubbleSimulation = null; // 全局仿真引擎指针，防止多图切换时内存泄漏

// 细分赛道映射配置
const colors = {
    "Fruit Tea": "#f59e0b",
    "Light Milk Tea": "#2dd4bf",
    "Low-Sugar Tea Drinks": "#10b981",
    "Milk Tea / Cheese Foam / Others": "#6366f1",
    "Oat Milk Tea": "#b45309"
};

const catLogos = {
    "Fruit Tea": "🍊",
    "Light Milk Tea": "🧋",
    "Low-Sugar Tea Drinks": "🍵",
    "Milk Tea / Cheese Foam / Others": "🥤",
    "Oat Milk Tea": "🌾"
};

const getCategoryColor = (cat) => colors[cat] || "var(--primary-light)";
const getCategoryLogo = (cat) => catLogos[cat] || "🥤";

/**
 * 渲染：交互式力导向气泡云图 (Bubble Cloud)
 * @param {Array} brandData 已经过小写规范清洗、降序排列后的全量品牌数组
 * @param {number} limit 动态滑块当前限制的数量
 * @param {Array} coreBrands 与消费者订单重合的核心高亮品牌列表
 */

/**
 * 2-A：渲染交互式力导向气泡云图 (Bubble Cloud)
 */
export function renderBubbleCloud(brandData, limit, coreBrands = []) {
    const container = d3.select("#market-concentration-chart");
    container.selectAll("svg").remove(); // 清空旧画布

    if (bubbleSimulation) bubbleSimulation.stop(); // 稳妥阻断上一次的物理动效

    // 获取容器尺寸，如果高度为0则设置默认值
    let width = container.node().clientWidth;
    let height = container.node().clientHeight;
    
    // 关键修复：如果高度为0，设置默认高度
    if (height < 100) {
        console.warn("容器高度为", height, "设置默认高度400px");
        height = 400;
        // 同时设置容器样式
        container.style("height", "400px");
    }
    
    if (width < 100) {
        console.warn("容器宽度为", width, "设置默认宽度800px");
        width = 800;
    }

    // 确保数据存在
    if (!brandData || brandData.length === 0) {
        console.error("brandData 为空");
        container.html(`<div style="color:#9ca3af; text-align:center; padding:3rem;">❌ 暂无品牌数据</div>`);
        return;
    }

    const dataSlice = brandData.slice(0, limit).filter(d => d && d.stores > 0);
    
    if (dataSlice.length === 0) {
        console.error("有效的品牌数据为空，请检查数据格式");
        container.html(`<div style="color:#9ca3af; text-align:center; padding:3rem;">⚠️ 无有效品牌数据<br>请检查 drink_shops.json 中的门店数量字段</div>`);
        return;
    }

    console.log(`渲染 ${dataSlice.length} 个品牌，容器尺寸: ${width}x${height}`);
    

    // const width = container.node().clientWidth || 800;
    // const height = 380;

    // // 清洗强转并检测是否为跨表重合的核心品牌
    // const dataSlice = brandData.slice(0, limit).map(d => ({
    //     ...d,
    //     isCore: coreBrands.includes(d.name)
    // }));

    const svg = container.append("svg").attr("width", width).attr("height", height);

    // 平方根比例尺：利用最大店数（如蜜雪冰城）作为天花板压制气泡无限膨胀
    const maxStores = d3.max(brandData, d => +d.stores) || 25500;
    const radiusScale = d3.scaleSqrt().domain([1, maxStores]).range([8, 65]);

    // 构建 D3 Force 力学仿真
    bubbleSimulation = d3.forceSimulation(dataSlice)
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("charge", d3.forceManyBody().strength(4))
        .force("collision", d3.forceCollide().radius(d => radiusScale(d.stores) + 2))
        .on("tick", () => {
            // 边缘碰撞墙限制
            nodes.attr("transform", d => `translate(${Math.max(65, Math.min(width - 65, d.x))}, ${Math.max(65, Math.min(height - 65, d.y))})`);
        });

    const nodes = svg.selectAll(".bubble-node")
        .data(dataSlice, d => d.name)
        .enter().append("g")
        .attr("class", "bubble-node")
        .style("cursor", "pointer")
        .call(d3.drag()
            .on("start", (e, d) => { if (!e.active) bubbleSimulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
            .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
            .on("end", (e, d) => { if (!e.active) bubbleSimulation.alphaTarget(0); d.fx = null; d.fy = null; }));

    // 画圆形气泡
    nodes.append("circle")
        .attr("r", d => radiusScale(d.stores))
        .attr("fill", d => getCategoryColor(d.category))
        .attr("opacity", 0.85)
        .attr("stroke", d => d.isCore ? "var(--secondary-light)" : "#334155")
        .attr("stroke-width", d => d.isCore ? 3 : 1)
        .style("filter", d => d.isCore ? "drop-shadow(0px 0px 6px var(--secondary-light))" : "none");

    // 绘制品类 Emoji 徽章
    nodes.append("text")
        .attr("dy", d => radiusScale(d.stores) > 25 ? "-3" : "4")
        .attr("text-anchor", "middle")
        .attr("font-size", d => Math.min(radiusScale(d.stores) * 0.5, 20) + "px")
        .text(d => getCategoryLogo(d.category));

    // 绘制精简品牌名称（中等及以上气泡可见）
    nodes.append("text")
        .attr("dy", "14")
        .attr("text-anchor", "middle")
        .attr("fill", "#ffffff")
        .attr("font-size", "10px")
        .style("pointer-events", "none")
        .text(d => radiusScale(d.stores) > 25 ? (d.name.length > 5 ? d.name.slice(0,4)+".." : d.name) : "");

    // 提示框交互
    const tooltip = d3.select("#global-tooltip");
    nodes.on("mouseover", function(event, d) {
        d3.select(this).select("circle").attr("opacity", 1);
        tooltip.style("opacity", 1)
            .html(`
                <div style="font-weight:bold; color:#fff; margin-bottom:4px;">${d.name}</div>
                <div style="color:var(--text-gray);">细分赛道: <span style="color:${getCategoryColor(d.category)}">${d.category}</span></div>
                <div style="color:var(--text-gray);">全国门店: <span style="color:var(--secondary-light); font-weight:bold;">${d.stores.toLocaleString()}</span> 家</div>
                <div style="color:var(--text-gray);">大盘客单价: ￥${d.price}</div>
                ${d.isCore ? '<div style="color:var(--secondary-light); margin-top:5px; font-size:11px;">⚠️ 核心重合：点击联动消费者画像</div>' : ''}
            `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 28) + "px");
    }).on("mousemove", event => {
        tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 28) + "px");
    }).on("mouseout", function() {
        d3.select(this).select("circle").attr("opacity", 0.85);
        tooltip.style("opacity", 0);
    });
}

/**
 * 2-B：渲染帕累托累计贡献图 (Pareto Chart)
 */
export function renderParetoChart(brandData) {
    const container = d3.select("#market-concentration-chart");
    container.selectAll("svg").remove();
    if (bubbleSimulation) bubbleSimulation.stop(); 

    const width = container.node().clientWidth || 800;
    const height = 380;
    const margin = { top: 40, right: 60, bottom: 60, left: 70 };

    const top20 = brandData.slice(0, 20);
    const totalStores = d3.sum(brandData, d => +d.stores);

    const svg = container.append("svg").attr("width", width).attr("height", height);

    const x = d3.scaleBand().domain(top20.map(d => d.name)).range([margin.left, width - margin.right]).padding(0.3);
    const yLeft = d3.scaleLinear().domain([0, d3.max(top20, d => +d.stores) * 1.1]).range([height - margin.bottom, margin.top]);
    
    let runningSum = 0;
    const pData = top20.map(d => {
        runningSum += +d.stores;
        return { name: d.name, percentage: (runningSum / totalStores) * 100 };
    });
    const yRight = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);

    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .call(g => g.select(".domain").attr("stroke", "#334155"))
        .call(g => g.selectAll(".tick text").attr("fill", "#94a3b8").attr("transform", "rotate(-30)").style("text-anchor", "end"));

    svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yLeft).ticks(5))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick text").attr("fill", "#94a3b8"));

    svg.append("g")
        .attr("transform", `translate(${width - margin.right}, 0)`)
        .call(d3.axisRight(yRight).tickFormat(d => d + "%"))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick text").attr("fill", "#f59e0b"));

    svg.selectAll(".bar")
        .data(top20)
        .enter().append("rect")
        .attr("x", d => x(d.name))
        .attr("y", d => yLeft(+d.stores))
        .attr("width", x.bandwidth())
        .attr("height", d => height - margin.bottom - yLeft(+d.stores))
        .attr("fill", d => getCategoryColor(d.category))
        .attr("opacity", 0.85);

    const lineGenerator = d3.line().x(d => x(d.name) + x.bandwidth() / 2).y(d => yRight(d.percentage));
    svg.append("path").datum(pData).attr("fill", "none").attr("stroke", "#f59e0b").attr("stroke-width", 3).attr("d", lineGenerator);
}