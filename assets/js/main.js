import * as d3 from 'd3';
import { CONSUMER_DATA_PATH, DRINKS_SHOP_DATA_PATH } from "./constants/consts.js"
import { initDecisionTree } from "./decisionTree/initDecisionTree.js";
import { renderPriceDistribution, renderGroupedHistogram } from './part1.js';
import { renderBubbleCloud, renderParetoChart } from './part2.js';
import { renderPositioningMatrix } from './part3.js';
import { listenToConsumerBehaviorEvent } from "./consumptionBehavior.js";

let cachedBrandsData = [];
let crossCoreBrands = [];
let activeView = "bubble"; 
let activePriceView = "scatter";

async function loadAndBootstrap() {
    try {
        const [brands, orders] = await Promise.all([
            d3.json(DRINKS_SHOP_DATA_PATH),
            d3.json(CONSUMER_DATA_PATH)
        ]);


        const cleanedBrands = brands.map(d => {
            return {
                name: d["Name"] || "Unknown",
                logo: d["logo"] || "",
                price: parseFloat(String(d["Average Price"] || 0).replace(/[¥$元\s]/g, "")) || 0,
                stores: parseInt(d["Number of Stores"] || 0) || 0,
                category: d["Type"] || "Others"
            };
        });
        
        cachedBrandsData = cleanedBrands.sort((a, b) => (+b.stores) - (+a.stores));

        const orderCounts = d3.rollup(orders, v => v.length, d => d.brand);
        crossCoreBrands = Array.from(orderCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(d => d[0]);

        setupPriceControls(); 
        setupConcentrationControls();

        renderPositioningMatrix(cachedBrandsData);

        window.cachedBrandsData = cachedBrandsData;
        window.crossCoreBrands = crossCoreBrands;
        listenToConsumerBehaviorEvent();
        
    } catch (err) {
        console.error("[Fatal Exception] Main data provisioning pipeline failed:", err);
    }
}

function setupPriceControls() {
    const slider = document.getElementById("dot-slider");
    const label = document.getElementById("dot-count-label");
    const sliderContainer = document.getElementById("dot-slider-container");
    const btnScatter = document.getElementById("btn-price-scatter");
    const btnHistogram = document.getElementById("btn-price-histogram");

    const getDotLimit = () => slider ? parseInt(slider.value) : 60;

    function updatePriceView() {
        if (activePriceView === "scatter") {
            if (sliderContainer) sliderContainer.style.display = "inline-flex"; // Show slider capsule
            renderPriceDistribution(cachedBrandsData, getDotLimit());
        } else if (activePriceView === "histogram") {
            if (sliderContainer) sliderContainer.style.display = "none";
            renderGroupedHistogram(cachedBrandsData);
        }
    }

    updatePriceView();

    if (slider && label) {
        slider.addEventListener("input", (e) => {
            const val = parseInt(e.target.value);
            label.innerText = val;
            if (activePriceView === "scatter") {
                renderPriceDistribution(cachedBrandsData, val);
            }
        });
    }

    if (btnScatter && btnHistogram) {
        btnScatter.addEventListener("click", () => {
            btnScatter.classList.add("active");
            btnHistogram.classList.remove("active");
            activePriceView = "scatter";
            updatePriceView();
        });

        btnHistogram.addEventListener("click", () => {
            btnHistogram.classList.add("active");
            btnScatter.classList.remove("active");
            activePriceView = "histogram";
            updatePriceView();
        });
    }
}


function setupConcentrationControls() {
    const slider = document.getElementById("bubble-count-slider");
    const sliderValue = document.getElementById("slider-value");
    const btnBubble = document.getElementById("btn-show-bubble");
    const btnPareto = document.getElementById("btn-show-pareto");

    const getCurrentLimit = () => slider ? parseInt(slider.value) : 20;

    function updateConcentrationView() {
        const limit = getCurrentLimit();
        if (activeView === "bubble") {
            renderBubbleCloud(cachedBrandsData, limit, crossCoreBrands);
        } else if (activeView === "pareto") {
            renderParetoChart(cachedBrandsData);
        }
    }

    updateConcentrationView();

    if (slider && sliderValue) {
        slider.addEventListener("input", (e) => {
            const count = parseInt(e.target.value);
            sliderValue.innerText = count + " Brands";
            updateConcentrationView();
        });
    }

    if (btnBubble && btnPareto) {
        btnBubble.addEventListener("click", () => {
            btnBubble.classList.add("active");
            btnPareto.classList.remove("active");
            activeView = "bubble";
            if (slider) slider.parentElement.style.opacity = "1";
            updateConcentrationView();
        });

        btnPareto.addEventListener("click", () => {
            btnPareto.classList.add("active");
            btnBubble.classList.remove("active");
            activeView = "pareto";
            if (slider) slider.parentElement.style.opacity = "0.5";
            updateConcentrationView();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initDecisionTree();
    loadAndBootstrap();
})