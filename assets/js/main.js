import * as d3 from 'd3';
import { CONSUMER_DATA_PATH, DRINKS_SHOP_DATA_PATH } from "./constants/consts.js"
import { initDecisionTree } from "./decisionTree/initDecisionTree.js";

// Decoupled modules import
import { renderPriceDistribution, renderGroupedHistogram } from './part1.js';
import { renderBubbleCloud, renderParetoChart } from './part2.js';
import { renderPositioningMatrix } from './part3.js';

import { listenToConsumerBehaviorEvent } from "./consumptionBehavior.js";

// Global reactive state cache, supporting slider filtering, multi-view switching, and cross-component linking
let cachedBrandsData = [];
let crossCoreBrands = [];
let activeView = "bubble"; 
let activePriceView = "scatter";

/**
 * Asynchronous data loading and distribution pipeline: 
 * Reads two independent datasets, performs cleaning/normalization, and conducts precise distribution.
 */
async function loadAndBootstrap() {
    try {
        // Simultaneously load the macroeconomic brand summary (drink_shops) and micro-level consumer transaction orders (consumer_behavior)
        const [brands, orders] = await Promise.all([
            d3.json(DRINKS_SHOP_DATA_PATH),
            d3.json(CONSUMER_DATA_PATH)
        ]);

        console.log(`[Data Center] Datasets loaded successfully. Macro brand library: ${brands.length} units, Consumer behavior library: ${orders.length} transactions.`);

        // 1. 💡 Clean brand data: Strictly and exclusively use the standard uppercase keys inherent in drink_shops for deep normalization
        const cleanedBrands = brands.map(d => {
            return {
                name: d["Name"] || "Unknown",
                logo: d["logo"] || "",
                // Filter out currency symbols (¥), "yuan" characters, and extra spaces, then parse into standard floats
                price: parseFloat(String(d["Average Price"] || 0).replace(/[¥$元\s]/g, "")) || 0,
                stores: parseInt(d["Number of Stores"] || 0) || 0,
                category: d["Type"] || "Others"
            };
        });
        
        // Sort by total national store count in descending order to ensure absolute accuracy for subsequent Pareto and Top 20 calculations
        cachedBrandsData = cleanedBrands.sort((a, b) => (+b.stores) - (+a.stores));

        // 2. Cross-data correlation: Calculate the Top 5 brands with the highest actual order volume from 31,800 consumer behavior records to serve as the linking bond between views
        const orderCounts = d3.rollup(orders, v => v.length, d => d.brand);
        crossCoreBrands = Array.from(orderCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(d => d[0]);

        console.log("[Data Center] Core cross-referenced brands highlighted:", crossCoreBrands);

        // 3. Trigger interactions for sliders and view buttons
        setupPriceControls(); 
        setupConcentrationControls();

        // 5. Pass the brand data cachedBrandsData to the price/scale positioning matrix (Part 3) for initial rendering
        renderPositioningMatrix(cachedBrandsData);

        // Bind core variables to the global space for debugging
        window.cachedBrandsData = cachedBrandsData;
        window.crossCoreBrands = crossCoreBrands;
        console.log("[Data Center] Brand data routing pipeline loaded, state machine running stably.");

        listenToConsumerBehaviorEvent();
        
    } catch (err) {
        console.error("[Fatal Exception] Main data provisioning pipeline failed:", err);
    }
}

/**
 * Price distribution and frequency analysis dashboard controller and dual-mode switching state machine (Part 1 module) 🔥
 */
function setupPriceControls() {
    const slider = document.getElementById("dot-slider");
    const label = document.getElementById("dot-count-label");
    const sliderContainer = document.getElementById("dot-slider-container");
    const btnScatter = document.getElementById("btn-price-scatter");
    const btnHistogram = document.getElementById("btn-price-histogram");

    const getDotLimit = () => slider ? parseInt(slider.value) : 60;

    // Core price view state machine dispatcher
    function updatePriceView() {
        if (activePriceView === "scatter") {
            if (sliderContainer) sliderContainer.style.display = "inline-flex"; // Show slider capsule
            renderPriceDistribution(cachedBrandsData, getDotLimit());
        } else if (activePriceView === "histogram") {
            if (sliderContainer) sliderContainer.style.display = "none";        // Completely hide slider capsule
            renderGroupedHistogram(cachedBrandsData);
        }
    }

    // Trigger initial render for Part 1
    updatePriceView();

    // Listener: Smooth adjustment of scatter plot limit
    if (slider && label) {
        slider.addEventListener("input", (e) => {
            const val = parseInt(e.target.value);
            label.innerText = val;
            if (activePriceView === "scatter") {
                renderPriceDistribution(cachedBrandsData, val);
            }
        });
    }

    // Listener: Toggle between scatter plot and grouped histogram
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


/**
 * Market concentration dashboard controller and view switching state machine manager (Part 2 module)
 */
function setupConcentrationControls() {
    const slider = document.getElementById("bubble-count-slider");
    const sliderValue = document.getElementById("slider-value");
    const btnBubble = document.getElementById("btn-show-bubble");
    const btnPareto = document.getElementById("btn-show-pareto");

    const getCurrentLimit = () => slider ? parseInt(slider.value) : 20;

    // View refresh function
    function updateConcentrationView() {
        const limit = getCurrentLimit();
        if (activeView === "bubble") {
            renderBubbleCloud(cachedBrandsData, limit, crossCoreBrands);
        } else if (activeView === "pareto") {
            renderParetoChart(cachedBrandsData);
        }
    }

    // Initialize initial render
    updateConcentrationView();

    // Listener: Adjust displayed brand count via slider
    if (slider && sliderValue) {
        slider.addEventListener("input", (e) => {
            const count = parseInt(e.target.value);
            sliderValue.innerText = count + " Brands";
            updateConcentrationView();
        });
    }

    // Listener: Toggle between Bubble Cloud and Pareto chart
    if (btnBubble && btnPareto) {
        btnBubble.addEventListener("click", () => {
            btnBubble.classList.add("active");
            btnPareto.classList.remove("active");
            activeView = "bubble";
            // Restore opacity and usability of the count slider when showing bubble chart
            if (slider) slider.parentElement.style.opacity = "1";
            updateConcentrationView();
        });

        btnPareto.addEventListener("click", () => {
            btnPareto.classList.add("active");
            btnBubble.classList.remove("active");
            activeView = "pareto";
            // Dim slider when showing Pareto (Pareto analysis defaults to fixed Top 20 brand data)
            if (slider) slider.parentElement.style.opacity = "0.5";
            updateConcentrationView();
        });
    }
}

// entry point
document.addEventListener('DOMContentLoaded', () => {
    initDecisionTree();
    loadAndBootstrap();
})