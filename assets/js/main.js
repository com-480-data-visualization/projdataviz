import * as d3 from 'd3';
import { CONSUMER_DATA_PATH, DRINKS_SHOP_DATA_PATH } from "./constants/consts.js"
import { initDecisionTree } from "./decisionTree/initDecisionTree.js";

import { renderBubbleCloud, renderParetoChart } from './part2.js';

// 全局响应式状态缓存
let cachedBrandsData = [];
let crossCoreBrands = [];
let activeView = "bubble";

/**
 * 现代异步管道：读取两张 JSON 真实数据集并自动计算交集
 */
async function loadAndBootstrap() {
    try {
        // 💡 异步读取项目中的两个真实数据（确保路径正确，比如在 public 目录下）
        const [brands, orders] = await Promise.all([
            d3.json(DRINKS_SHOP_DATA_PATH),
            d3.json(CONSUMER_DATA_PATH)
        ]);

        console.log(`成功装载数据：品牌库(${brands.length}家)，订单库(${orders.length}条)`);

        const cleanedBrands = brands.map(d => {
            return {
                name: d["Name"],                                // "Name" -> name
                logo: d["logo"],                                // "logo" -> logo
                price: parseFloat(d["Average Price"]) || 0,     // "Average Price" -> price
                stores: parseInt(d["Number of Stores"]) || 0,   // "Number of Stores" -> stores
                category: d["Type"]                             // "Type" -> category 
            };
        });

        // 1. 数据清洗：按店数做全局大盘降序
        cachedBrandsData = cleanedBrands.sort((a, b) => (+b.stores) - (+a.stores));

        // 2. 动态纽带计算：从 31,800 条订单里找出点单量最高的 Top 5 大牌，作为两张表的交叉高亮标志
        const orderCounts = d3.rollup(orders, v => v.length, d => d.brand);
        crossCoreBrands = Array.from(orderCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(d => d[0]);

        console.log("联动高亮核心交叉品牌确定:", crossCoreBrands);

        // 3. 唤醒市场集中度分析看板交互事件
        setupConcentrationControls();
        window.cachedBrandsData = cachedBrandsData;
        window.crossCoreBrands = crossCoreBrands;
        console.log("全局数据已暴露，品牌数量:", cachedBrandsData.length);

    } catch (err) {
        console.error("现代数据管道加载发生致命异常:", err);
    }
}

/**
 * 控制器事件绑定与状态状态机管理
 */
function setupConcentrationControls() {
    const slider = document.getElementById("bubble-count-slider");
    const sliderValue = document.getElementById("slider-value");

    // 默认首屏调用：渲染开店规模最大的前 20 个品牌
    renderBubbleCloud(cachedBrandsData, 20, crossCoreBrands);

    // 监听 HTML5 滑块的动态拖拽，平滑控制重绘数量
    if (slider) {
        slider.addEventListener("input", (e) => {
            const count = parseInt(e.target.value);
            sliderValue.innerText = count + " 个";
            // 实时驱动气泡组件重绘
            renderBubbleCloud(cachedBrandsData, count, crossCoreBrands);
        });
    }
}

// entry point
document.addEventListener('DOMContentLoaded', () => {
    initDecisionTree();
    loadAndBootstrap();
})