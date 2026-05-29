/**
 * Price Distribution Chart Module (Part 1)
 * Processes the tea/drinks brand dataset (drink_shops.json), calculates high-fidelity boxplot metrics,
 * and presents the pricing ecosystem of the market using a jittered scatter plot.
 * Fully supports the 3 main categories: Tea drinks, Coffee, Milk drinks.
 */
import * as d3 from 'd3';

// Color system corresponding to the 3 vertical tracks in drink_shops.json
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

// Unified mapping table to resolve key case-sensitivity conflicts
const categoryTranslations = {
    "Tea drinks": "Tea Drinks",
    "Coffee": "Coffee",
    "Milk drinks": "Milk Drinks / Dairy Drinks"
};

/**
 * Dynamically inject styles for the price distribution chart (including control capsules)
 */
function injectStyles() {
    if (document.getElementById("price-chart-styles")) return;
    
    const style = document.createElement("style");
    style.id = "price-chart-styles";
    style.textContent = `
        #dot-slider-container, #slider-container {
            display: inline-flex ;
            align-items: center;
            gap: 12px;
            background: rgba(255, 255, 255, 0.6);
            backdrop-filter: blur(4px);
            border: 1px solid var(--border);
            padding: 4px 14px;
            border-radius: 20px; 
            transition: all var(--transition-fast);
        }

        #dot-slider-container:hover, #slider-container:hover {
            background: rgba(255, 255, 255, 0.9);
            border-color: var(--text-gray);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        }

        #dot-slider-container label {
            font-size: 12px;
            color: var(--text-gray);
            font-family: var(--font-sans);
            user-select: none;
            margin: 0;
        }

        /* Unified input track style */
        #dot-slider, #bubble-count-slider {
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
        #dot-slider:focus, #bubble-count-slider:focus {
            background: var(--text-gray);
        }

        /* Webkit Slider Thumb (Chrome, Safari, Edge) */
        #dot-slider::-webkit-slider-thumb, #bubble-count-slider::-webkit-slider-thumb {
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
        #dot-slider::-webkit-slider-thumb:hover, #bubble-count-slider::-webkit-slider-thumb:hover {
            transform: scale(1.22);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2), 0 0 0 6px rgba(233, 69, 96, 0.15);
        }
        #dot-slider::-webkit-slider-thumb:active, #bubble-count-slider::-webkit-slider-thumb:active {
            cursor: grabbing;
            transform: scale(1.1);
            background: var(--secondary-light, #ff5e7e);
        }

        /* Dynamic number label badge */
        #dot-count-label, #slider-value {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-dark, #111827);
            font-family: var(--font-sans);
            background: var(--bg-main, #f3f4f6);
            padding: 2px 8px;
            border-radius: 10px;
            min-width: 58px; /* Locked width to prevent jitter */
            text-align: center;
            display: inline-block;
            border: 1px solid var(--border);
        }

    `;
    document.head.appendChild(style);
}

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
    
    return "Tea drinks"; // Default fallback
}

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

export function renderPriceDistribution(brandData, dotLimit = 60) {
    injectStyles();
    const container = d3.select("#price-distribution-chart");
    container.selectAll("*").remove(); // Clean up residual chart structure

    let width = container.node().clientWidth || 800;
    let height = 450;
    
    const chartWrapper = container.append("div")
        .attr("class", "chart-relative-container")
        .style("height", height + "px")
        .style("position", "relative")
        .style("background", "var(--bg-card)")
        .style("border-radius", "12px")
        .style("border", "1px solid var(--border)")
        .style("overflow", "hidden");

    const svg = chartWrapper.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "transparent");

    const margin = { top: 50, right: 40, bottom: 60, left: 65 };

    const validData = brandData.map(d => {
        if (!d) return null;
        const name = d.name || d.Name || "Unknown";
        const rawCategory = d.category || d.Type || "Others";
        const category = normalizeCategory(rawCategory, name);
        
        let price = 0;
        if (d.price !== undefined && d.price !== null) {
            price = parseFloat(String(d.price).replace(/[¥$元\s]/g, "")) || 0;
        } else if (d["Average Price"] !== undefined) {
            price = parseFloat(String(d["Average Price"]).replace(/[¥$元\s]/g, "")) || 0;
        }
        
        let stores = 0;
        if (d.stores !== undefined) {
            stores = parseInt(d.stores) || 0;
        } else if (d["Number of Stores"] !== undefined) {
            stores = parseInt(d["Number of Stores"]) || 0;
        }

        return { name, category, price, stores };
    }).filter(d => d && d.price > 0 && d.category);


    if (validData.length === 0) {
        chartWrapper.html(`
            <div style="color:var(--text-gray); text-align:center; padding:5rem; font-family:var(--font-sans);">
                ⚠️ Unable to load valid brand price data.<br>
                <small style="color:var(--secondary); display:block; margin-top:10px;">
                    Please check if drink_shops.json contains any anomalies.
                </small>
            </div>
        `);
        return;
    }

    const categories = Object.keys(colors);

    const boxplotData = categories.map(cat => {
        const records = validData.filter(d => d.category === cat);
        const prices = records.map(d => d.price).sort(d3.ascending);
        
        let q1 = 0, median = 0, q3 = 0, min = 0, max = 0, iqr = 0;
        if (prices.length > 0) {
            q1 = d3.quantile(prices, 0.25);
            median = d3.quantile(prices, 0.50);
            q3 = d3.quantile(prices, 0.75);
            iqr = q3 - q1;
            min = Math.max(d3.min(prices), q1 - 1.5 * iqr);
            max = Math.min(d3.max(prices), q3 + 1.5 * iqr);
        }

        const sampledRecords = records.length > dotLimit 
            ? d3.shuffle([...records]).slice(0, dotLimit) 
            : records;

        return {
            category: cat,
            records: sampledRecords,
            q1, median, q3, min, max,
            actualCount: records.length
        };
    });

    const x = d3.scaleBand()
        .domain(categories)
        .range([margin.left, width - margin.right])
        .padding(0.45);

    const maxPriceVal = d3.max(validData, d => d.price) * 1.05 || 50;
    const y = d3.scaleLinear()
        .domain([0, maxPriceVal])
        .range([height - margin.bottom, margin.top])
        .nice();

    const tooltip = getOrCreateTooltip();

    const yTicks = y.ticks(8);
    svg.append("g")
        .selectAll("line")
        .data(yTicks)
        .enter().append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", d => y(d))
        .attr("y2", d => y(d))
        .attr("stroke", "var(--border)")
        .attr("stroke-width", 0.5)
        .attr("stroke-dasharray", "3,3");

    // X-axis
    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .call(g => g.select(".domain").attr("stroke", "var(--border)"))
        .call(g => g.selectAll(".tick text")
            .attr("fill", "var(--text-gray)")
            .style("font-size", "11px")
            .style("font-family", "var(--font-sans)"));

    // Y-axis
    svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(y).tickFormat(d => "¥" + d))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick text")
            .attr("fill", "var(--text-gray)")
            .style("font-size", "11px"));

    // Y-axis title
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", margin.left - 45)
        .attr("x", -(height / 2))
        .attr("fill", "var(--text-gray)")
        .attr("font-size", "12px")
        .style("text-anchor", "middle")
        .text("Average Menu Price (RMB)");

    const boxGroups = svg.selectAll(".box-group")
        .data(boxplotData)
        .enter().append("g")
        .attr("class", "box-group");

    // Boxplot whiskers
    boxGroups.append("line")
        .attr("x1", d => x(d.category) + x.bandwidth() / 2)
        .attr("x2", d => x(d.category) + x.bandwidth() / 2)
        .attr("y1", d => y(d.min))
        .attr("y2", d => y(d.max))
        .attr("stroke", d => getCategoryColor(d.category))
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,4");

    // Boxplot top cap
    boxGroups.append("line")
        .attr("x1", d => x(d.category) + x.bandwidth() * 0.35)
        .attr("x2", d => x(d.category) + x.bandwidth() * 0.65)
        .attr("y1", d => y(d.min))
        .attr("y2", d => y(d.min))
        .attr("stroke", d => getCategoryColor(d.category))
        .attr("stroke-width", 1.5);

    // Boxplot bottom cap
    boxGroups.append("line")
        .attr("x1", d => x(d.category) + x.bandwidth() * 0.35)
        .attr("x2", d => x(d.category) + x.bandwidth() * 0.65)
        .attr("y1", d => y(d.max))
        .attr("y2", d => y(d.max))
        .attr("stroke", d => getCategoryColor(d.category))
        .attr("stroke-width", 1.5);

    // Boxplot central rectangle
    boxGroups.append("rect")
        .attr("x", d => x(d.category))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.q3))
        .attr("height", d => Math.max(1, y(d.q1) - y(d.q3))) // Prevent zero height
        .attr("fill", d => getCategoryColor(d.category))
        .attr("fill-opacity", 0.12)
        .attr("stroke", d => getCategoryColor(d.category))
        .attr("stroke-width", 1.8)
        .attr("rx", 4)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill-opacity", 0.25);
            tooltip.style("opacity", 1)
                .html(`
                    <div style="font-family:var(--font-serif); font-weight:bold; color:var(--secondary); margin-bottom:6px; font-size:13px;">${categoryTranslations[d.category] || d.category} Track Overview</div>
                    <div class="detail-row" style="display:flex; justify-content:space-between; gap:20px; margin:4px 0; font-size:11px;">
                        <span style="color:var(--text-gray)">Total Brands Covered:</span>
                        <span style="font-weight:bold; color:var(--primary-dark);">${d.actualCount.toLocaleString()}</span>
                    </div>
                    <hr style="border-top:1px dashed var(--border); margin:6px 0;">
                    <div class="detail-row" style="display:flex; justify-content:space-between; gap:20px; margin:4px 0; font-size:11px;">
                        <span style="color:var(--text-gray)">Price Max:</span>
                        <span style="font-weight:bold; color:var(--primary-dark);">¥${d.max.toFixed(1)}</span>
                    </div>
                    <div class="detail-row" style="display:flex; justify-content:space-between; gap:20px; margin:4px 0; font-size:11px;">
                        <span style="color:var(--text-gray)">Q3 (75th Percentile):</span>
                        <span style="font-weight:bold; color:var(--primary-dark);">¥${d.q3.toFixed(1)}</span>
                    </div>
                    <div class="detail-row" style="display:flex; justify-content:space-between; gap:20px; margin:4px 0; font-size:11px;">
                        <span style="color:var(--secondary); font-weight:bold;">Median Price:</span>
                        <span style="font-weight:bold; color:var(--secondary);">¥${d.median.toFixed(1)}</span>
                    </div>
                    <div class="detail-row" style="display:flex; justify-content:space-between; gap:20px; margin:4px 0; font-size:11px;">
                        <span style="color:var(--text-gray)">Q1 (25th Percentile):</span>
                        <span style="font-weight:bold; color:var(--primary-dark);">¥${d.q1.toFixed(1)}</span>
                    </div>
                    <div class="detail-row" style="display:flex; justify-content:space-between; gap:20px; margin:4px 0; font-size:11px;">
                        <span style="color:var(--text-gray)">Price Min:</span>
                        <span style="font-weight:bold; color:var(--primary-dark);">¥${d.min.toFixed(1)}</span>
                    </div>
                `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", event => {
            tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("fill-opacity", 0.12);
            tooltip.style("opacity", 0);
        });

    // Median line
    boxGroups.append("line")
        .attr("x1", d => x(d.category))
        .attr("x2", d => x(d.category) + x.bandwidth())
        .attr("y1", d => y(d.median))
        .attr("y2", d => y(d.median))
        .attr("stroke", d => getCategoryColor(d.category))
        .attr("stroke-width", 3);

    // Jittered scatter dots
    const jitterWidth = x.bandwidth() * 0.75;

    boxGroups.each(function(boxData) {
        const group = d3.select(this);
        
        const dots = group.selectAll(".jitter-dot")
            .data(boxData.records)
            .enter().append("circle")
            .attr("class", "jitter-dot")
            .attr("r", 4.5)
            .attr("cx", d => {
                if (!d.jitterX) {
                    d.jitterX = (Math.random() - 0.5) * jitterWidth;
                }
                return x(boxData.category) + x.bandwidth() / 2 + d.jitterX;
            })
            .attr("cy", height - margin.bottom)
            .attr("fill", d => getCategoryColor(d.category))
            .attr("opacity", 0)
            .attr("stroke", "var(--bg-card)")
            .attr("stroke-width", 1)
            .style("cursor", "pointer");

        // Smooth entry animation
        dots.transition()
            .duration(800)
            .delay((d, i) => Math.min(i * 12, 450))
            .attr("cy", d => y(d.price))
            .attr("opacity", 0.75);

        // Tooltip for individual dots
        dots.on("mouseover", function(event, d) {
            d3.select(this).transition().duration(150).attr("r", 7.5).attr("opacity", 1);
            tooltip.style("opacity", 1)
                .html(`
                    <div style="font-family:var(--font-serif); font-weight:bold; color:var(--primary-dark); margin-bottom:4px; font-size:13px;">${d.name}</div>
                    <div style="color:var(--text-gray); font-size:11px; margin-bottom:3px;">Category: <span style="color:${getCategoryColor(d.category)}; font-weight:600;">${d.category}</span></div>
                    <div style="color:var(--text-gray); font-size:11px; margin-bottom:3px;">National Scale: <span style="font-weight:600; color:var(--primary-light);">${d.stores.toLocaleString()} stores</span></div>
                    <div style="border-top:1px dashed var(--border); margin-top:5px; padding-top:4px; font-weight:bold; color:var(--secondary); font-size:12px;">Avg Price: ¥${d.price.toFixed(1)}</div>
                `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", event => {
            tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).transition().duration(150).attr("r", 4.5).attr("opacity", 0.75);
            tooltip.style("opacity", 0);
        });

    });
}

export function renderGroupedHistogram(brandData) {
    const container = d3.select("#price-distribution-chart");
    container.selectAll("*").remove();

    const width = container.node().clientWidth || 800;
    const height = 450;
    const margin = { top: 85, right: 40, bottom: 60, left: 65 };

    const chartWrapper = container.append("div")
        .attr("class", "chart-relative-container")
        .style("height", height + "px")
        .style("position", "relative")
        .style("background", "var(--bg-card)")
        .style("border-radius", "12px")
        .style("border", "1px solid var(--border)")
        .style("overflow", "hidden");

    const svg = chartWrapper.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "transparent");

    const validData = brandData.map(d => {
        if (!d) return null;
        const name = d.name || d.Name || "Unknown";
        const rawCategory = d.category || d.Type || "Others";
        const category = normalizeCategory(rawCategory, name);
        
        let price = 0;
        if (d.price !== undefined && d.price !== null) {
            price = parseFloat(String(d.price).replace(/[¥\$元\s]/g, "")) || 0;
        } else if (d["Average Price"] !== undefined) {
            price = parseFloat(String(d["Average Price"]).replace(/[¥\$元\s]/g, "")) || 0;
        }
        return { name, category, price };
    }).filter(d => d && d.price > 0 && d.category);

    const categories = Object.keys(colors);
    const maxPriceVal = d3.max(validData, d => d.price) || 40;

    const binGenerator = d3.bin()
        .value(d => d.price)
        .domain([0, Math.ceil(maxPriceVal / 5) * 5])
        .thresholds(10);

    const bins = binGenerator(validData);

    const groupedData = bins.map(bin => {
        const counts = { "Tea drinks": 0, "Coffee": 0, "Milk drinks": 0 };
        bin.forEach(d => {
            if (counts[d.category] !== undefined) counts[d.category]++;
        });
        return {
            x0: bin.x0,
            x1: bin.x1,
            label: `¥${bin.x0}-${bin.x1}`,
            values: categories.map(cat => ({ category: cat, count: counts[cat] })),
            maxCount: d3.max(Object.values(counts))
        };
    });

    const xGroup = d3.scaleBand()
        .domain(groupedData.map(d => d.label))
        .range([margin.left, width - margin.right])
        .paddingInner(0.25);

    const xSubGroup = d3.scaleBand()
        .domain(categories)
        .range([0, xGroup.bandwidth()])
        .padding(0.08);

    const maxYVal = d3.max(groupedData, d => d.maxCount) || 10;
    const y = d3.scaleLinear()
        .domain([0, maxYVal * 1.1])
        .range([height - margin.bottom, margin.top])
        .nice();

    const tooltip = getOrCreateTooltip();

    svg.append("g")
        .selectAll("line")
        .data(y.ticks(6))
        .enter().append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", d => y(d))
        .attr("y2", d => y(d))
        .attr("stroke", "var(--border)")
        .attr("stroke-width", 0.5)
        .attr("stroke-dasharray", "3,3");

    // X-axis
    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xGroup))
        .call(g => g.select(".domain").attr("stroke", "var(--border)"))
        .call(g => g.selectAll(".tick text")
            .attr("fill", "var(--text-gray)")
            .style("font-size", "11px"));

    // Y-axis
    svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("d")))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick text").attr("fill", "var(--text-gray)"));

    // Y-axis title
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", margin.left - 45)
        .attr("x", -(height / 2))
        .attr("fill", "var(--text-gray)")
        .attr("font-size", "12px")
        .style("text-anchor", "middle")
        .text("Brand Count (Frequency)");

    // ----------------------------------------------------
    // 5. HTML Legend Capsule
    // ----------------------------------------------------
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
        .data(categories)
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

    const itemGroups = svg.append("g")
        .selectAll(".price-group")
        .data(groupedData)
        .enter().append("g")
        .attr("class", "price-group")
        .attr("transform", d => `translate(${xGroup(d.label)}, 0)`);

    const bars = itemGroups.selectAll("rect")
        .data(d => d.values)
        .enter().append("rect")
        .attr("class", "histogram-bar")
        .attr("data-category", d => d.category)
        .attr("x", d => xSubGroup(d.category))
        .attr("width", xSubGroup.bandwidth())
        .attr("fill", d => getCategoryColor(d.category))
        .attr("rx", 3)
        .attr("y", height - margin.bottom)
        .attr("height", 0)
        .attr("opacity", 0.85);

    bars.transition()
        .duration(800)
        .delay((d, i) => i * 40)
        .ease(d3.easeCubicOut)
        .attr("y", d => y(d.count))
        .attr("height", d => height - margin.bottom - y(d.count));

        const labels = itemGroups.selectAll(".bar-label")
        .data(d => d.values)
        .enter().append("text")
        .attr("class", "bar-label")
        .attr("data-category", d => d.category)
        .attr("x", d => xSubGroup(d.category) + xSubGroup.bandwidth() / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("font-weight", "bold") 
        .style("font-family", "var(--font-sans, sans-serif)")
        .style("fill", d => getCategoryColor(d.category))
        .attr("y", height - margin.bottom)
        .style("opacity", 0)
        .text(d => d.count > 0 ? d.count : "");

    labels.transition()
        .duration(800)
        .delay((d, i) => i * 40)
        .ease(d3.easeCubicOut)
        .attr("y", d => {
            const idealY = y(d.count) - 5;
            const baselineY = height - margin.bottom - 8;
            return d.count > 0 && idealY > baselineY ? baselineY : idealY;
        })
        .style("opacity", d => d.count > 0 ? 0.95 : 0); 

    bars.on("mouseover", function(event, d) {
        const parentData = d3.select(this.parentNode).datum();
        d3.select(this).attr("opacity", 1.0);
        
        tooltip.style("opacity", 1)
            .html(`
                <div style="font-family:var(--font-serif); font-weight:bold; color:var(--primary-dark); margin-bottom:4px; font-size:13px;">
                    ${getCategoryLogo(d.category)} ${categoryTranslations[d.category] || d.category}
                </div>
                <div style="color:var(--text-gray); font-size:11px; margin-bottom:3px;">
                    Price Range: <span style="font-weight:600; color:var(--text-dark);">${parentData.label}</span>
                </div>
                <div style="border-top:1px dashed var(--border); margin-top:5px; padding-top:4px; font-weight:bold; color:var(--secondary); font-size:12px;">
                    Brands in range: ${d.count}
                </div>
            `);
    })
    .on("mousemove", event => {
        tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
        d3.select(this).attr("opacity", 0.85);
        tooltip.style("opacity", 0);
    });

    legendItems.on("mouseover", function(event, targetCat) {
        bars.transition().duration(150)
            .attr("opacity", d => d.category === targetCat ? 1.0 : 0.15);
        itemGroups.selectAll(".bar-label").transition().duration(150)
            .style("opacity", d => d.count > 0 ? (d.category === targetCat ? 0.9 : 0.1) : 0);
        d3.select(this)
            .style("border-color", "var(--text-gray)")
            .style("background", "rgba(0,0,0,0.02)")
            .style("color", "var(--text-main)");
    })
    .on("mouseout", function() {
        bars.transition().duration(150).attr("opacity", 0.85);
        
        itemGroups.selectAll(".bar-label").transition().duration(150)
            .style("opacity", d => d.count > 0 ? 0.9 : 0);
            
        d3.select(this)
            .style("border-color", "var(--border)")
            .style("background", "var(--bg-card)")
            .style("color", "var(--text-gray)");
    });
}