/**
 * Price vs. Store Count Positioning Matrix Component (Part 3)
 * Processes the Drink Shops dataset (Brand-level metadata containing stores, category, and average pricing).
 * Features a dynamic quadrant split based on median values, linear/logarithmic scale toggles,
 * and real-time category filtering. Adapted fully to site-wide CSS design tokens.
 */
import * as d3 from 'd3';

// Color Palette
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
 * Robust Category Normalizer (💡 Crucial Fix for Color Mismatch)
 * Normalizes any category variant to one of the 5 canonical keys perfectly.
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

    return "Tea drinks";
}

/**
 * Dynamically injects positioning matrix interactive styles
 */
function injectMatrixStyles() {
    if (document.getElementById("matrix-chart-interactive-styles")) return;

    const style = document.createElement("style");
    style.id = "matrix-chart-interactive-styles";
    style.textContent = `
        /* Matrix chart container card styling */
        .matrix-container-wrapper {
            position: relative;
            width: 100%;
            height: 100%;
            min-height: 480px;
            background: var(--bg-card);
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid var(--border);
            font-family: var(--font-sans);
            padding: var(--spacing-sm);
        }

        /* Upper Interactive Header block */
        .matrix-header-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border);
            margin-bottom: 16px;
        }

        /* Toggle Button Group (Linear vs Log) */
        .scale-toggle-group {
            display: inline-flex;
            background: var(--bg-main);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 3px;
        }
        .scale-toggle-btn {
            background: transparent;
            border: none;
            color: var(--text-gray);
            padding: 5px 12px;
            font-size: 11px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
            transition: all var(--transition-fast);
        }
        .scale-toggle-btn.active {
            background: var(--bg-card);
            color: var(--secondary);
            box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        }

        /* Filter legend check pill layout */
        .matrix-filter-pills {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .filter-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 12px;
            border-radius: 100px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            border: 1px solid var(--border);
            background: var(--bg-card);
            color: var(--text-gray);
            transition: all var(--transition-fast);
            user-select: none;
        }
        .filter-pill.active {
            background: var(--bg-main);
            color: var(--text-dark);
            border-color: var(--text-dark);
            opacity: 1 !important;
        }
        /* Style for inactive toggled off categories */
        .filter-pill:not(.active) {
            opacity: 0.38;
            background: var(--bg-main);
            border-style: dashed;
        }
        .pill-color-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }

        /* Quadrant Label Indicators inside SVG space */
        .quadrant-bg-label {
            fill: var(--text-gray);
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            opacity: 0.35;
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Global Shared Tooltip Spawner
 */
function getOrCreateTooltip() {
    let t = d3.select("#global-tooltip");
    if (t.empty()) {
        t = d3.select("body").append("div")
            .attr("id", "global-tooltip")
            .style("position", "absolute")
            .style("opacity", 0)
            .style("pointer-events", "none")
            .style("background", "rgba(255, 255, 255, 0.98)")
            .style("color", "var(--text-dark)")
            .style("padding", "10px 14px")
            .style("border-radius", "8px")
            .style("font-size", "12px")
            .style("box-shadow", "0 10px 25px -10px rgba(0, 0, 0, 0.12)")
            .style("z-index", "99999")
            .style("border", "1px solid var(--border)")
            .style("transition", "opacity(0.15s)");
    }
    return t;
}

/**
 * 3-A: Render Price vs. Store Count Positioning Matrix
 */
export function renderPositioningMatrix(brandData) {
    injectMatrixStyles();
    const container = d3.select("#positioning-matrix");
    container.selectAll("*").remove(); // Clean up old structure

    let width = container.node().clientWidth || 800;
    let height = 480;

    const wrapper = container.append("div")
        .attr("class", "matrix-container-wrapper");

    // --------------------------------====================
    // 💡 Key Modification 1: Data cleaning + filter low-store noise
    // --------------------------------====================
    const validData = brandData.map(d => {
        if (!d) return null;
        const name = d.name || d.Name || "Unknown";
        const rawCategory = d.category || d.Type || "Others";
        const category = typeof normalizeCategory === 'function' ? normalizeCategory(rawCategory, name) : rawCategory;

        let price = 0;
        if (d.price !== undefined && d.price !== null) {
            price = parseFloat(String(d.price).replace(/[¥\$元\s]/g, "")) || 0;
        } else if (d["Average Price"] !== undefined) {
            price = parseFloat(String(d["Average Price"]).replace(/[¥\$元\s]/g, "")) || 0;
        }

        const stores = parseInt(d.stores || d["Number of Stores"]) || 0;

        // Maintain existing jitter calculation rules
        const charSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const jitterY = ((charSum % 24) - 12) * 1.0;

        return { name, category, price, stores, jitterY };
    }).filter(d => d && d.price > 0 && d.stores > 1); // 🔥 Key Filter: Only keep chain brands with > 1 store to clean up noise

    if (validData.length === 0) {
        wrapper.html(`<div style="color:var(--text-gray); text-align:center; padding:5rem;">❌ No valid positioning records loaded.</div>`);
        return;
    }

    // 1. Create top control header
    const controlsHeader = wrapper.append("div").attr("class", "matrix-header-controls");
    const filterContainer = controlsHeader.append("div").attr("class", "matrix-filter-pills");

    const activeCategories = {};
    Object.keys(colors).forEach(cat => {
        activeCategories[cat] = true;
    });

    let yIsLogScale = true;
    const scaleToggleGroup = controlsHeader.append("div").attr("class", "scale-toggle-group");

    const linearBtn = scaleToggleGroup.append("button")
        .attr("class", "scale-toggle-btn")
        .text("Linear Scale");

    const logBtn = scaleToggleGroup.append("button")
        .attr("class", "scale-toggle-btn active")
        .text("Logarithmic Scale (Stores)");

    // Initialize SVG canvas
    const chartHeight = height - 90;
    const svg = wrapper.append("svg")
        .attr("width", width)
        .attr("height", chartHeight)
        .style("background", "transparent");

    const margin = { top: 40, right: 30, bottom: 45, left: 65 };
    const tooltip = getOrCreateTooltip();

    // 2. Calculate Median Gold Standards
    const allPrices = validData.map(d => d.price).sort(d3.ascending);
    const allStores = validData.map(d => d.stores).sort(d3.ascending);
    const medianPrice = d3.median(allPrices) || 15;
    const medianStores = d3.median(allStores) || 300;

    // Scale configuration
    const x = d3.scaleLinear()
        .domain([0, d3.max(validData, d => d.price) * 1.05 || 40])
        .range([margin.left, width - margin.right])
        .nice();

    function getYScale(isLog) {
        if (isLog) {
            return d3.scaleLog()
                .domain([1, d3.max(validData, d => d.stores) * 1.2 || 25000])
                .range([chartHeight - margin.bottom, margin.top]);
        } else {
            return d3.scaleLinear()
                .domain([0, d3.max(validData, d => d.stores) * 1.05 || 25000])
                .range([chartHeight - margin.bottom, margin.top])
                .nice();
        }
    }
    let y = getYScale(yIsLogScale);

    // 3. Axis groups
    const xAxisGroup = svg.append("g").attr("transform", `translate(0, ${chartHeight - margin.bottom})`);
    const yAxisGroup = svg.append("g").attr("transform", `translate(${margin.left}, 0)`);

    function drawAxes() {
        const xAxis = d3.axisBottom(x).tickFormat(d => "¥" + d);
        xAxisGroup.call(xAxis)
            .call(g => g.select(".domain").attr("stroke", "var(--border)"))
            .call(g => g.selectAll(".tick text").attr("fill", "var(--text-gray)").style("font-size", "11px"));

        const yAxis = d3.axisLeft(y).ticks(yIsLogScale ? 5 : 8, yIsLogScale ? "~s" : "d");
        yAxisGroup.transition().duration(600).call(yAxis)
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick text").attr("fill", "var(--text-gray)").style("font-size", "11px"));
    }

    const yLabel = svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", margin.left - 45)
        .attr("x", -(chartHeight / 2))
        .attr("fill", "var(--text-gray)")
        .attr("font-size", "11px")
        .style("text-anchor", "middle")
        .text("Store Scale Count (Log)");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", chartHeight - 10)
        .attr("fill", "var(--text-gray)")
        .attr("font-size", "11px")
        .style("text-anchor", "middle")
        .text("Brand Average Menu Price (RMB)");

    const dividerGroup = svg.append("g").attr("class", "matrix-dividers");
    const quadrantLabelGroup = svg.append("g").attr("class", "matrix-quadrant-labels");

    function renderDividersAndGrid(isInit = false) {
        dividerGroup.selectAll("*").remove();
        quadrantLabelGroup.selectAll("*").remove();

        dividerGroup.append("line")
            .attr("x1", x(medianPrice))
            .attr("x2", x(medianPrice))
            .attr("y1", margin.top)
            .attr("y2", chartHeight - margin.bottom)
            .attr("stroke", "var(--secondary)")
            .attr("stroke-width", 1.2)
            .attr("stroke-dasharray", "4,4")
            .attr("opacity", 0.45);

        const storeLine = dividerGroup.append("line")
            .attr("x1", margin.left)
            .attr("x2", width - margin.right)
            .attr("y1", y(medianStores))
            .attr("y2", y(medianStores))
            .attr("stroke", "var(--secondary)")
            .attr("stroke-width", 1.2)
            .attr("stroke-dasharray", "4,4")
            .attr("opacity", 0.45);

        if (!isInit) {
            storeLine.attr("y1", y(medianStores)).attr("y2", y(medianStores));
        }

        quadrantLabelGroup.append("text").attr("class", "quadrant-bg-label").attr("x", margin.left + 15).attr("y", margin.top + 20).text("Mass Giants 🏰");
        quadrantLabelGroup.append("text").attr("class", "quadrant-bg-label").attr("x", width - margin.right - 15).attr("y", margin.top + 20).style("text-anchor", "end").text("Premium Giants 🏆");
        quadrantLabelGroup.append("text").attr("class", "quadrant-bg-label").attr("x", margin.left + 15).attr("y", chartHeight - margin.bottom - 15).text("Budget Boutique 🌱");
        quadrantLabelGroup.append("text").attr("class", "quadrant-bg-label").attr("x", width - margin.right - 15).attr("y", chartHeight - margin.bottom - 15).style("text-anchor", "end").text("Premium Boutique 💎");
    }

    const dotLayer = svg.append("g").attr("class", "matrix-dot-layer");

    function getQuadrantDescription(d) {
        if (d.price >= medianPrice) {
            return d.stores >= medianStores
                ? "Premium Giant 🏆 (High Price, Large Scale)"
                : "Premium Boutique 💎 (High Price, Boutique Scale)";
        } else {
            return d.stores >= medianStores
                ? "Mass Market Giant 🏰 (Budget Price, Large Scale)"
                : "Budget Boutique 🌱 (Budget Price, Emerging/Local)";
        }
    }

    function updateScatterPlot(isInit = false) {
        drawAxes();
        renderDividersAndGrid(isInit);

        const dots = dotLayer.selectAll(".matrix-dot")
            .data(validData, d => d.name);

        dots.exit()
            .transition().duration(500)
            .attr("opacity", 0)
            .attr("r", 0)
            .remove();

        const dotsEnter = dots.enter().append("circle")
            .attr("class", "matrix-dot")
            .attr("cx", d => x(d.price))
            .attr("cy", d => y(d.stores) + (yIsLogScale ? 0 : d.jitterY))
            .attr("r", 0)
            .attr("fill", d => getCategoryColor(d.category))
            .attr("opacity", 0)
            // Add subtle semi-transparent border for better overlap distinction
            .attr("stroke", "var(--bg-card, #fff)")
            .attr("stroke-width", 0.8)
            .style("cursor", "pointer")
            .style("transition", "stroke 0.2s, stroke-width 0.2s");

        const transitionDuration = isInit ? 850 : 600;

        dotsEnter.merge(dots)
            .transition().duration(transitionDuration)
            .attr("cx", d => x(d.price))
            .attr("cy", d => y(d.stores) + (yIsLogScale ? 0 : d.jitterY))
            // ----------------------------------------------------
            // 💡 Key Modification 2: Reduce radius for small brands, release breathing room
            // ----------------------------------------------------
            .attr("r", d => {
                if (d.stores > 5000) return 10; // Large giants remain prominent
                if (d.stores > 1000) return 7;  // Medium brands
                return 3.2;                     // 🔥 Small/micro brand radius reduced from 4.8 to 3.2, eliminating congestion
            })
            // ----------------------------------------------------
            // 💡 Key Modification 3: High-transparency opacity, forming "density hotspots" naturally
            // ----------------------------------------------------
            .attr("opacity", d => {
                if (!activeCategories[d.category]) return 0.03;
                return d.stores > 1000 ? 0.75 : 0.38; // 🔥 Normal dot opacity reduced from 0.72 to 0.38 for a cleaner look
            })
            .style("pointer-events", d => activeCategories[d.category] ? "auto" : "none");

        const interactiveDots = isInit ? dotsEnter : dotLayer.selectAll(".matrix-dot");

        interactiveDots.on("mouseover", function (event, d) {
            // 💡 Highlighted dots are raised and scaled up for strong feedback
            d3.select(this)
                .raise()
                .transition()
                .duration(150)
                .attr("stroke", "var(--text-dark, #111827)")
                .attr("stroke-width", 1.8)
                .attr("opacity", 1)
                .attr("r", d => d.stores > 5000 ? 12 : (d.stores > 1000 ? 9 : 6.5));

            tooltip
                .style("opacity", 1)
                .html(
                    `<div style="font-family:var(--font-serif); font-weight:bold; color:var(--primary-dark); margin-bottom:5px; font-size:13.5px;">${getCategoryLogo(d.category)} ${d.name}</div> ` +
                    `<div style="color:var(--text-gray); font-size:11px; margin-bottom:3px;">Segment: <span style="color:${getCategoryColor(d.category)}; font-weight:600;">${d.category}</span></div> ` +
                    `<div style="color:var(--text-gray); font-size:11px; margin-bottom:3px;">Stores Count: <span style="font-weight:600; color:var(--primary-light);">${d.stores.toLocaleString()} shops</span></div> ` +
                    `<div style="color:var(--text-gray); font-size:11px; margin-bottom:5px;">Average Price: <span style="font-weight:600; color:#10b981;">¥${d.price.toFixed(1)}</span></div> ` +
                    `<div style="border-top:1px dashed var(--border); margin-top:6px; padding-top:5px; font-weight:bold; color:var(--secondary); font-size:11.5px; line-height:1.3;"> Positioning:<br>${getQuadrantDescription(d)} </div>`
                )
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
            .on("mousemove", event => {
                tooltip
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function (event, d) {
                // Restore transparent particle state on mouseout
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("stroke", "var(--bg-card)")
                    .attr("stroke-width", 0.8)
                    .attr("r", d => {
                        if (d.stores > 5000) return 10;
                        if (d.stores > 1000) return 7;
                        return 3.2;
                    })
                    .attr("opacity", activeCategories[d.category] ? (d.stores > 1000 ? 0.75 : 0.38) : 0.03);

                tooltip.style("opacity", 0);
            });

    }

    // 4. Build filter interactions
    Object.keys(colors).forEach(cat => {
        const pill = filterContainer.append("div")
            .attr("class", "filter-pill active")
            .attr("data-cat", cat);

        pill.append("div")
            .attr("class", "pill-color-dot")
            .style("background-color", colors[cat]);

        pill.append("span")
            .text(getCategoryLogo(cat) + " " + (categoryTranslations[cat] || cat));

        pill.on("click", function () {
            const isActive = d3.select(this).classed("active");
            d3.select(this).classed("active", !isActive);
            activeCategories[cat] = !isActive;
            updateScatterPlot(false);
        });
    });

    // 5. Linear vs Log axis toggle
    linearBtn.on("click", function () {
        if (!yIsLogScale) return;
        yIsLogScale = false;
        linearBtn.classed("active", true);
        logBtn.classed("active", false);
        yLabel.text("Store Scale Count (Linear)");
        y = getYScale(false);
        updateScatterPlot(false);
    });

    logBtn.on("click", function () {
        if (yIsLogScale) return;
        yIsLogScale = true;
        logBtn.classed("active", true);
        linearBtn.classed("active", false);
        yLabel.text("Store Scale Count (Log)");
        y = getYScale(true);
        updateScatterPlot(false);
    });

    // Initial render trigger
    updateScatterPlot(true);
}