/**
 * Market Concentration Component (Part 2)
 * Processes the Drink Shops dataset (Brand-level metadata containing stores, category, and average pricing).
 * Features an interactive force-directed Bubble Cloud utilizing circular clipped SVG brand logos,
 * search-based brand locator, blinking highlights, legend, and details panel.
 * Aligned perfectly with brand categories: Tea drinks, Coffee, and Milk drinks.
 */
import * as d3 from 'd3';
let bubbleSimulation = null; // Global force simulation pointer to prevent memory leaks during view toggles

// Category colors aligned with standard scheme
const colors = {
    "Tea drinks": "#f59e0b",
    "Coffee": "#10b981",
    "Milk drinks": "#6366f1"
};

const catLogos = {
    "Tea drinks": "🍵",
    "Coffee": "☕",
    "Milk drinks": "🧋"
};

const getCategoryColor = (cat) => colors[cat] || "var(--secondary)";
const getCategoryLogo = (cat) => catLogos[cat] || "🥤";

const categoryTranslations = {
    "Tea drinks": "Tea Drinks",
    "Coffee": "Coffee",
    "Milk drinks": "Milk Drinks / Dairy Drinks"
};

/**
 * Robust Category Normalizer
 */
function normalizeCategory(rawCat, brandName = "") {
    const r = String(rawCat || "").toLowerCase().trim();
    const n = String(brandName || "").toLowerCase().trim();
    
    if (r.includes("coffee") || n.includes("coffee") || n.includes("咖啡") || r.includes("咖啡")) {
        return "Coffee";
    }
    if (r.includes("milk") || r.includes("cheese") || r.includes("foam") || r.includes("dairy") || n.includes("milk") || n.includes("乳") || n.includes("奶")) {
        return "Milk drinks";
    }
    if (r.includes("tea") || r.includes("fruit") || r.includes("sugar") || n.includes("茶")) {
        return "Tea drinks";
    }
    return "Tea drinks";
}

/**
 * Dynamically injects interactive styles into the document head
 */
function injectStyles() {
    if (document.getElementById("bubble-chart-interactive-styles")) return;
    
    const style = document.createElement("style");
    style.id = "bubble-chart-interactive-styles";
    style.textContent = `
        /* Dynamic Category-colored pulsating highlight animation */
        @keyframes bubble-pulsate {
            0% {
                stroke-width: var(--border-width, 3px);
                filter: drop-shadow(0 0 4px var(--bubble-color));
            }
            50% {
                stroke-width: 8px;
                filter: drop-shadow(0 0 16px var(--bubble-color)) saturate(1.5);
            }
            100% {
                stroke-width: var(--border-width, 3px);
                filter: drop-shadow(0 0 4px var(--bubble-color));
            }
        }

        .bubble-node circle.highlighted-blink {
            animation: bubble-pulsate 1.5s infinite ease-in-out;
            opacity: 1 !important;
            stroke: var(--bubble-color) !important;
        }

        /* Bubble hover and transitional effects */
        .bubble-node {
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .bubble-node:hover {
            filter: brightness(1.05) contrast(1.02);
        }

        /* Chart container card styling */
        .chart-relative-container {
            position: relative;
            width: 100%;
            height: 100%;
            min-height: 450px;
            background: var(--bg-card);
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid var(--border);
            font-family: var(--font-sans);
            transition: all var(--transition-normal);
        }

        /* Floating details card */
        .bubble-details-card {
            position: absolute;
            left: 20px;
            bottom: 20px;
            width: 270px;
            background: rgba(255, 255, 255, 0.96);
            backdrop-filter: blur(10px);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 14px 18px;
            color: var(--text-dark);
            box-shadow: 0 10px 25px -10px rgba(0, 0, 0, 0.08);
            pointer-events: auto;
            z-index: 10;
            transition: all var(--transition-fast);
        }
        .bubble-details-card h4 {
            margin: 0 0 8px 0;
            font-size: 16px;
            font-family: var(--font-serif);
            font-weight: 600;
            color: var(--secondary);
            border-bottom: 1px dashed var(--border);
            padding-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .bubble-details-card .detail-row {
            display: flex;
            justify-content: space-between;
            margin: 6px 0;
            font-size: 13px;
        }
        .bubble-details-card .detail-label {
            color: var(--text-gray);
        }
        .bubble-details-card .detail-value {
            font-weight: 600;
            color: var(--primary-dark);
        }

        /* Interactive Category Legend */
        .bubble-legend-panel {
            position: absolute;
            left: 20px;
            top: 20px;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(8px);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 10px 14px;
            pointer-events: none;
            z-index: 10;
            box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: var(--text-gray);
            margin: 5px 0;
        }
        .legend-color-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }

        /* Brand selection locator panel */
        .bubble-control-panel {
            position: absolute;
            right: 20px;
            bottom: 20px;
            background: rgba(255, 255, 255, 0.96);
            backdrop-filter: blur(10px);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 14px;
            width: 290px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            z-index: 10;
            box-shadow: 0 10px 25px -10px rgba(0, 0, 0, 0.08);
        }
        .control-instruction {
            font-size: 11px;
            color: var(--text-gray);
            line-height: 1.4;
        }
        .bubble-select, .bubble-search-input {
            width: 100%;
            background: var(--bg-main);
            border: 1px solid var(--border);
            color: var(--text-dark);
            padding: 7px 10px;
            border-radius: 6px;
            font-size: 13px;
            outline: none;
            box-sizing: border-box;
            transition: border var(--transition-fast), box-shadow var(--transition-fast);
        }
        .bubble-select:focus, .bubble-search-input:focus {
            border-color: var(--secondary);
            box-shadow: 0 0 0 2px rgba(233, 69, 96, 0.1);
        }
        .search-group {
            display: flex;
            gap: 6px;
        }
        .search-btn {
            background: var(--secondary);
            border: none;
            color: var(--text-light);
            padding: 0 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            transition: background var(--transition-fast), transform var(--transition-fast);
        }
        .search-btn:hover {
            background: var(--secondary-light);
            transform: translateY(-1px);
        }
        .search-btn:active {
            transform: translateY(0);
        }

        /* Container layout */
        #slider-container {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            background: rgba(255, 255, 255, 0.6);
            backdrop-filter: blur(4px);
            border: 1px solid var(--border);
            padding: 4px 14px;
            border-radius: 20px;
            transition: all var(--transition-fast);
        }
        #slider-container:hover {
            background: rgba(255, 255, 255, 0.9);
            border-color: var(--text-gray);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        }

        /* Remove native slider appearance */
        #bubble-count-slider {
            -webkit-appearance: none;
            appearance: none;
            width: 130px;
            height: 5px;
            background: var(--border, #e5e7eb);
            border-radius: 3px;
            outline: none;
            cursor: pointer;
            transition: background 0.3s ease;
        }
        #bubble-count-slider:focus {
            background: var(--text-gray);
        }

        /* ── Webkit Slider Thumb ── */
        #bubble-count-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 15px;
            height: 15px;
            border-radius: 50%;
            background: var(--secondary, #e94560);
            border: 2.5px solid var(--bg-card, #fff);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 0 0 0px rgba(233, 69, 96, 0.15);
            cursor: grab;
            transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        #bubble-count-slider::-webkit-slider-thumb:hover {
            transform: scale(1.22);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2), 0 0 0 6px rgba(233, 69, 96, 0.15);
        }
        #bubble-count-slider::-webkit-slider-thumb:active {
            cursor: grabbing;
            transform: scale(1.1);
            background: var(--secondary-light, #ff5e7e);
        }

        /* ── Firefox Slider Thumb ── */
        #bubble-count-slider::-moz-range-thumb {
            width: 15px;
            height: 15px;
            border-radius: 50%;
            background: var(--secondary, #e94560);
            border: 2.5px solid var(--bg-card, #fff);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
            cursor: grab;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        #bubble-count-slider::-moz-range-thumb:hover {
            transform: scale(1.22);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2), 0 0 0 6px rgba(233, 69, 96, 0.15);
        }
        #bubble-count-slider::-moz-range-thumb:active {
            cursor: grabbing;
            transform: scale(1.1);
        }

        /* Dynamic number badge label */
        #slider-value {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-dark, #111827);
            font-family: var(--font-sans);
            background: var(--bg-main, #f3f4f6);
            padding: 2px 8px;
            border-radius: 10px;
            min-width: 58px;
            text-align: center;
            display: inline-block;
            border: 1px solid var(--border);
        }
    `;
    document.head.appendChild(style);
}

/**
 * 2-A: Render interactive force-directed Bubble Cloud
 */
export function renderBubbleCloud(brandData, limit, coreBrands = []) {
    injectStyles();

    const outerContainer = d3.select("#market-concentration-chart");
    outerContainer.selectAll("*").remove(); // Clean container

    if (bubbleSimulation) bubbleSimulation.stop(); // Safe reset

    // Create relative outer wrapper
    const container = outerContainer.append("div")
        .attr("class", "chart-relative-container");

    let width = container.node().clientWidth || 800;
    let height = 450;
    container.style("height", height + "px");

    if (!brandData || brandData.length === 0) {
        container.html(`<div style="color:var(--text-gray); text-align:center; padding:5rem;">❌ Failed to load beverage brand database.</div>`);
        return;
    }

    // Clean, normalize and map properties dynamically
    const dataSlice = brandData.slice(0, limit)
        .filter(d => d && d.stores > 0)
        .map((d, index) => {
            const rawCategory = d.category || d.Type || "Others";
            return {
                ...d,
                category: normalizeCategory(rawCategory, d.name),
                rank: index + 1, // National market rank
                isCore: coreBrands.includes(d.name)
            };
        });

    if (dataSlice.length === 0) {
        container.html(`<div style="color:var(--text-gray); text-align:center; padding:5rem;">⚠️ No active brands found to render.</div>`);
        return;
    }

    console.log("[Part 2] Bubble Cloud Rendered Size:", dataSlice.length);

    // Append primary SVG canvas
    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "transparent");

    // Radius scale proportional to maximum stores
    const maxStores = d3.max(brandData, d => +d.stores) || 25000;
    const radiusScale = d3.scaleSqrt().domain([1, maxStores]).range([15, 75]);

    // Setup definitions (Defs) for dynamic clipPaths (one clipPath per brand to keep logos rounded)
    const defs = svg.append("defs");
    const getClipId = (d, i) => `clip-logo-${d.name.replace(/[^a-zA-Z0-9]/g, "")}-${i}`;

    dataSlice.forEach((d, i) => {
        defs.append("clipPath")
            .attr("id", getClipId(d, i))
            .append("circle")
            .attr("r", radiusScale(d.stores));
    });

    // 1. Plot Brand Category Legend
    const legendPanel = container.append("div")
        .attr("class", "bubble-legend-panel");
    
    legendPanel.append("div")
        .style("font-weight", "600")
        .style("font-size", "11px")
        .style("color", "var(--text-dark)")
        .style("margin-bottom", "6px")
        .text("Brand Category Legend");

    Object.keys(colors).forEach(cat => {
        const item = legendPanel.append("div").attr("class", "legend-item");
        item.append("div")
            .attr("class", "legend-color-dot")
            .style("background-color", colors[cat]);
        item.append("span").text(`${getCategoryLogo(cat)} ${categoryTranslations[cat] || cat}`);
    });

    // 2. Setup Details Card Panel
    const detailsCard = container.append("div")
        .attr("class", "bubble-details-card");
    
    function updateDetailsCard(d) {
        if (!d) {
            detailsCard.html(`
                <h4>🥤 Brand Details</h4>
                <p style="font-size:12px; color:var(--text-gray); margin:10px 0; text-align:center; line-height:1.5;">
                    💡 Hover over any bubble<br>or select a brand on the right to view statistics.
                </p>
            `);
            return;
        }
        detailsCard.html(`
            <h4>${getCategoryLogo(d.category)} ${d.name}</h4>
            <div class="detail-row">
                <span class="detail-label">Market Rank:</span>
                <span class="detail-value" style="color:var(--secondary);">No. ${d.rank}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Total Stores:</span>
                <span class="detail-value" style="color:var(--primary-light);">${d.stores.toLocaleString()} shops</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Average Price:</span>
                <span class="detail-value" style="color:#10b981;">¥${d.price.toFixed(1)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Segment:</span>
                <span class="detail-value" style="color:${getCategoryColor(d.category)}; font-size:11px;">${d.category}</span>
            </div>
            ${d.isCore ? `
                <div style="margin-top:8px; padding-top:6px; border-top:1px dashed var(--border); font-size:11px; color:var(--secondary); text-align:center; font-weight:bold;">
                    🔥 Core Consumer Choice
                </div>
            ` : ''}
        `);
    }
    updateDetailsCard(null);

    // 3. Setup Brand Selection Controller Panel (Brand Locator Panel)
    const controlPanel = container.append("div")
        .attr("class", "bubble-control-panel");

    controlPanel.append("div")
        .attr("class", "control-instruction")
        .html("🎯 <b>Brand Locator</b><br>Select or search a brand name below to make its corresponding bubble pulsate.");

    const selectBox = controlPanel.append("select")
        .attr("class", "bubble-select")
        .attr("id", "brand-select-dropdown");
    
    selectBox.append("option")
        .attr("value", "")
        .text("-- Select a Brand to Locate --");
    
    dataSlice.forEach(d => {
        selectBox.append("option")
            .attr("value", d.name)
            .text(`No.${d.rank} - ${d.name} (${d.stores.toLocaleString()} shops)`);
    });

    const searchGroup = controlPanel.append("div").attr("class", "search-group");
    const searchInput = searchGroup.append("input")
        .attr("class", "bubble-search-input")
        .attr("type", "text")
        .attr("placeholder", "Search brand name...");
    const searchBtn = searchGroup.append("button")
        .attr("class", "search-btn")
        .text("Search");

    function highlightBrand(brandName) {
        svg.selectAll(".bubble-circle")
            .classed("highlighted-blink", false)
            .attr("opacity", 0.85);
        
        if (!brandName) {
            updateDetailsCard(null);
            return;
        }

        const matchedNode = dataSlice.find(d => d.name.toLowerCase() === brandName.toLowerCase());
        if (matchedNode) {
            svg.selectAll(".bubble-circle")
                .filter(d => d.name === matchedNode.name)
                .classed("highlighted-blink", true)
                .attr("opacity", 1);

            updateDetailsCard(matchedNode);

            matchedNode.vx += (width / 2 - matchedNode.x) * 0.12;
            matchedNode.vy += (height / 2 - matchedNode.y) * 0.12;
            if (bubbleSimulation) {
                bubbleSimulation.alphaTarget(0.2).restart();
                setTimeout(() => bubbleSimulation.alphaTarget(0), 800);
            }
        }
    }

    selectBox.on("change", function() {
        const val = this.value;
        searchInput.property("value", val);
        highlightBrand(val);
    });

    function executeSearch() {
        const val = searchInput.property("value").trim();
        if (!val) {
            highlightBrand("");
            return;
        }
        const matched = dataSlice.find(d => d.name.toLowerCase().includes(val.toLowerCase()));
        if (matched) {
            selectBox.property("value", matched.name);
            highlightBrand(matched.name);
        } else {
            detailsCard.html(`
                <h4 style="color:var(--secondary);">⚠️ Brand Not Found</h4>
                <p style="font-size:12px; color:var(--text-gray); margin:10px 0; text-align:center; line-height:1.4;">
                    No brand matches "${val}"<br>within the current Top ${limit} filter list.
                </p>
            `);
        }
    }
    searchBtn.on("click", executeSearch);
    searchInput.on("keypress", function(event) {
        if (event.key === "Enter") {
            executeSearch();
        }
    });

    // 4. Force Simulation settings
    bubbleSimulation = d3.forceSimulation(dataSlice)
        .force("center", d3.forceCenter(width / 2, height / 2 - 25))
        .force("charge", d3.forceManyBody().strength(12))
        .force("collision", d3.forceCollide().radius(d => radiusScale(d.stores) + 3))
        .on("tick", () => {
            nodes.attr("transform", d => {
                const r = radiusScale(d.stores);
                d.x = Math.max(r + 15, Math.min(width - r - 15, d.x));
                d.y = Math.max(r + 15, Math.min(height - r - 15, d.y));
                return `translate(${d.x}, ${d.y})`;
            });
        });

    // 5. Create node layers & Drag Events
    const nodes = svg.selectAll(".bubble-node")
        .data(dataSlice, d => d.name)
        .enter().append("g")
        .attr("class", "bubble-node")
        .style("cursor", "pointer")
        .call(d3.drag()
            .on("start", (e, d) => { 
                if (!e.active) bubbleSimulation.alphaTarget(0.3).restart(); 
                d.fx = d.x; 
                d.fy = d.y; 
            })
            .on("drag", (e, d) => { 
                d.fx = e.x; 
                d.fy = e.y; 
            })
            .on("end", (e, d) => { 
                if (!e.active) bubbleSimulation.alphaTarget(0); 
                d.fx = null; 
                d.fy = null; 
            }));

    // 6. Draw background circles
    nodes.append("circle")
        .attr("class", "bubble-circle")
        .attr("r", d => radiusScale(d.stores))
        .attr("fill", d => getCategoryColor(d.category))
        .attr("stroke", d => getCategoryColor(d.category))
        .style("--bubble-color", d => getCategoryColor(d.category))
        .attr("stroke-width", 6) 
        .attr("opacity", 0.85);

    // 7. Render category Emojis (acting as fallback behind brand logos)
    nodes.append("text")
        .attr("dy", d => radiusScale(d.stores) > 30 ? "-4" : "5")
        .attr("text-anchor", "middle")
        .attr("font-size", d => Math.min(radiusScale(d.stores) * 0.5, 22) + "px")
        .style("pointer-events", "none")
        .text(d => getCategoryLogo(d.category));

    // 8. Plot shortened Brand Names labels inside circles (fallback)
    nodes.append("text")
        .attr("dy", "16")
        .attr("text-anchor", "middle")
        .attr("fill", "#ffffff")
        .attr("font-weight", "600")
        .attr("font-size", "10px")
        .style("pointer-events", "none")
        .text(d => radiusScale(d.stores) > 28 ? (d.name.length > 5 ? d.name.slice(0, 4) + ".." : d.name) : "");

    // 9. 💡 High Premium Feature: Clip and overlay brand logo images on top!
    nodes.filter(d => d.logo && d.logo !== "")
        .append("image")
        .attr("href", d => d.logo)
        .attr("x", d => -radiusScale(d.stores))
        .attr("y", d => -radiusScale(d.stores))
        .attr("width", d => radiusScale(d.stores) * 2)
        .attr("height", d => radiusScale(d.stores) * 2)
        .attr("clip-path", (d, i) => `url(#${getClipId(d, i)})`)
        .attr("preserveAspectRatio", "xMidYMid slice")
        .style("pointer-events", "none")
        .on("error", function() {
            // Smoothly remove image if logo URL is broken or blocked by CORS, falling back to emoji text
            d3.select(this).remove();
        });

    // 10. Mouse event listeners
    nodes.on("mouseover", function(event, d) {
        const hasActiveBlink = svg.selectAll("circle.highlighted-blink").size() > 0;
        if (!hasActiveBlink) {
            d3.select(this).select("circle").attr("opacity", 1);
            updateDetailsCard(d);
        }
    }).on("mouseout", function() {
        const hasActiveBlink = svg.selectAll("circle.highlighted-blink").size() > 0;
        if (!hasActiveBlink) {
            d3.select(this).select("circle").attr("opacity", 0.85);
            updateDetailsCard(null);
        }
    }).on("click", function(event, d) {
        selectBox.property("value", d.name);
        searchInput.property("value", d.name);
        highlightBrand(d.name);
    });
}

/**
 * 2-B: Render Pareto Cumulative Contribution Chart (Top 20 Giants)
 */
export function renderParetoChart(brandData) {
    const outerContainer = d3.select("#market-concentration-chart");
    outerContainer.selectAll("*").remove(); // Clear old layout

    if (window.bubbleSimulation) window.bubbleSimulation.stop(); 

    // Completely hide quantity slider
    d3.select("#slider-container").style("display", "none");

    const width = outerContainer.node().clientWidth || 800;
    const height = 450;
    // Reserved top space (85px) for adaptive legend capsule
    const margin = { top: 85, right: 65, bottom: 80, left: 75 };

    const svg = outerContainer.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "var(--bg-card)")
        .style("border-radius", "12px")
        .style("border", "1px solid var(--border)")
        .style("font-family", "var(--font-sans)");

    // Initialize standalone tooltip
    let tooltip = d3.select("#pareto-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("id", "pareto-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background", "var(--bg-card, #fff)")
            .style("border", "1px solid var(--border, #ccc)")
            .style("padding", "8px 12px")
            .style("border-radius", "6px")
            .style("font-size", "12px")
            .style("color", "var(--text-main, #333)")
            .style("pointer-events", "none")
            .style("box-shadow", "0 4px 12px rgba(0,0,0,0.1)")
            .style("z-index", "999");
    }

    // Data preprocessing
    const top20 = brandData.slice(0, 20).map(d => {
        const rawCategory = d.category || d.Type || "Others";
        return {
            ...d,
            category: normalizeCategory(rawCategory, d.name)
        };
    });
    const totalStores = d3.sum(brandData, d => +d.stores);

    // Scales
    const x = d3.scaleBand().domain(top20.map(d => d.name)).range([margin.left, width - margin.right]).padding(0.3);
    const yLeft = d3.scaleLinear().domain([0, d3.max(top20, d => +d.stores) * 1.1]).range([height - margin.bottom, margin.top]);
    
    let runningSum = 0;
    const pData = top20.map(d => {
        runningSum += +d.stores;
        return { 
            name: d.name, 
            stores: +d.stores, 
            percentage: (runningSum / totalStores) * 100,
            category: d.category 
        };
    });
    const yRight = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);

    // Axis rendering
    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .call(g => g.select(".domain").attr("stroke", "var(--border)"))
        .call(g => g.selectAll(".tick text")
            .attr("fill", "var(--text-gray)")
            .attr("transform", "rotate(-35)")
            .style("text-anchor", "end")
            .style("font-size", "11px"));

    svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yLeft).ticks(6))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick text").attr("fill", "var(--text-gray)"));

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", margin.left - 50)
        .attr("x", -(height / 2))
        .attr("fill", "var(--text-gray)")
        .attr("font-size", "12px")
        .style("text-anchor", "middle")
        .text("Total Stores (Shops)");

    svg.append("g")
        .attr("transform", `translate(${width - margin.right}, 0)`)
        .call(d3.axisRight(yRight).tickFormat(d => d + "%"))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick text").attr("fill", "var(--secondary)"));

    svg.append("text")
        .attr("transform", "rotate(90)")
        .attr("y", -(width - margin.right + 45))
        .attr("x", height / 2)
        .attr("fill", "var(--secondary)")
        .attr("font-size", "12px")
        .style("text-anchor", "middle")
        .text("Cumulative Market Share (%)");

    // Draw Pareto Bars
    const bars = svg.selectAll(".bar")
        .data(pData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.name))
        .attr("width", x.bandwidth())
        .attr("fill", d => getCategoryColor(d.category)) 
        .attr("rx", 3)
        .attr("y", height - margin.bottom)
        .attr("height", 0)
        .attr("opacity", 0.82);

    // Growing bar animation
    bars.transition()
        .duration(800)
        .delay((d, i) => i * 30)
        .ease(d3.easeCubicOut)
        .attr("y", d => yLeft(d.stores))
        .attr("height", d => height - margin.bottom - yLeft(d.stores));

    // Cumulative line animation
    const lineGenerator = d3.line()
        .x(d => x(d.name) + x.bandwidth() / 2)
        .y(d => yRight(d.percentage));
    
    const path = svg.append("path")
        .datum(pData)
        .attr("fill", "none")
        .attr("stroke", "var(--secondary)")
        .attr("stroke-width", 3.5)
        .attr("d", lineGenerator);

    const totalLength = path.node().getTotalLength();
    path.attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .delay(400)
        .duration(1000)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);

    // Line dot animation
    const dots = svg.selectAll(".line-dot")
        .data(pData)
        .enter().append("circle")
        .attr("class", "line-dot")
        .attr("cx", d => x(d.name) + x.bandwidth() / 2)
        .attr("cy", d => yRight(d.percentage))
        .attr("r", 4.5)
        .attr("fill", "var(--bg-card)")
        .attr("stroke", "var(--secondary)")
        .attr("stroke-width", 2)
        .attr("opacity", 0);

    dots.transition()
        .delay((d, i) => 400 + (i * (1000 / pData.length)))
        .duration(200)
        .attr("opacity", 1);

    const legendCategories = Object.keys(colors);

    // HTML bridge for legend
    const htmlLegendContainer = svg.append("foreignObject")
        .attr("x", margin.left)
        .attr("y", 25)
        .attr("width", width - margin.left - margin.right)
        .attr("height", 40)
        .style("pointer-events", "none");

    const flexPanel = htmlLegendContainer.append("xhtml:div")
        .style("display", "flex")
        .style("justify-content", "flex-end") 
        .style("gap", "12px")
        .style("width", "100%")
        .style("height", "100%");

    const legendItems = flexPanel.selectAll(".custom-legend-pill")
        .data(legendCategories)
        .enter().append("xhtml:div")
        .attr("class", "custom-legend-pill")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "6px")
        .style("padding", "4px 12px")
        .style("background", "var(--bg-card, #fff)")
        .style("border", "1px solid var(--border, #e5e7eb)")
        .style("border-radius", "14px")
        .style("font-size", "11px")
        .style("font-weight", "500")
        .style("color", "var(--text-gray, #6b7280)")
        .style("cursor", "pointer")
        .style("width", "max-content")
        .style("pointer-events", "auto")
        .style("transition", "all 0.2s ease");

    legendItems.append("xhtml:span")
        .style("display", "inline-block")
        .style("width", "8px")
        .style("height", "8px")
        .style("border-radius", "50%")
        .style("background-color", d => colors[d]);

    legendItems.append("xhtml:span")
        .text(d => `${getCategoryLogo(d)} ${categoryTranslations[d] || d}`);

    bars.on("mouseover", function(event, d) {
        d3.select(this).attr("opacity", 1);
        tooltip.style("visibility", "visible")
            .html(`
                <strong style="color:var(--text-main); font-size:13px;">${getCategoryLogo(d.category)} ${d.name}</strong><br/>
                <span style="color:var(--text-gray);">Category:</span> <b>${categoryTranslations[d.category]}</b><br/>
                <span style="color:var(--text-gray);">Stores:</span> <b>${d.stores}</b><br/>
                <span style="color:var(--secondary);">Cumulative:</span> <b>${d.percentage.toFixed(1)}%</b>
            `);
    })
    .on("mousemove", function(event) {
        tooltip.style("top", (event.pageY - 40) + "px")
               .style("left", (event.pageX + 15) + "px");
    })
    .on("mouseout", function() {
        d3.select(this).attr("opacity", 0.82);
        tooltip.style("visibility", "hidden");
    });

    // Legend hover logic
    legendItems.on("mouseover", function(event, targetCat) {
        bars.transition().duration(150)
            .attr("opacity", d => d.category === targetCat ? 1.0 : 0.15);
        
        d3.select(this)
            .style("border-color", "var(--text-gray, #6b7280)")
            .style("background", "rgba(0,0,0,0.02)")
            .style("color", "var(--text-main, #111827)");
    })
    .on("mouseout", function() {
        bars.transition().duration(150).attr("opacity", 0.82);
        
        d3.select(this)
            .style("border-color", "var(--border, #e5e7eb)")
            .style("background", "var(--bg-card, #fff)")
            .style("color", "var(--text-gray, #6b7280)");
    });
}