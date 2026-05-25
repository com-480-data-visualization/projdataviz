import { CITY_DATA_PATH, POPULARITY_DATA_PATH} from "./constants/consts.js";

let nationalAverageCache = null;
let globalProductDataCache = null;


/**
 * Encapsulated Generic D3 Donut/Pie Chart Renderer
 * @param {string} containerId - Container HTML selector
 * @param {Array} data - Array of dataset objects
 * @param {string} chartType - Identifier string to match with baseline data
 * @param {string} currentCityLabel - The readable tier name for the text prefix
 * @param {string} cityKey - The active filter key to branch text logic
 */
function renderPieChart(containerId, data, chartType, currentCityLabel, cityKey) {
  const container = d3.select(containerId);
  container.html(""); // Clear any previous remnants

  const width = container.node().getBoundingClientRect().width || 400;
  const height = 300;
  const radius = Math.min(width, height) / 2 - 50; 
  const svg = container.append("svg").attr("width", width).attr("height", height);

  // ======== Cyberpunk Glow Filter Definition ========
  const defs = svg.append("defs");
  const glowFilter = defs.append("filter")
    .attr("id", "neon-glow")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%");

  glowFilter.append("feGaussianBlur").attr("stdDeviation", "5").attr("result", "coloredBlur");
  const feMerge = glowFilter.append("feMerge");
  feMerge.append("feMergeNode").attr("in", "coloredBlur");
  feMerge.append("feMergeNode").attr("in", "SourceGraphic");


  const mainGroup = svg.append("g").attr("transform", `translate(${width / 2}, ${height / 2})`);

  // ======== Design System Theme Synchronization ========
  const rootStyles = getComputedStyle(document.documentElement);
  const colorSecondary = rootStyles.getPropertyValue('--secondary').trim();
  const colorAccent = rootStyles.getPropertyValue('--accent').trim();
  const colorPrimaryLight = rootStyles.getPropertyValue('--primary-light').trim();
  const colorSecondaryLight = rootStyles.getPropertyValue('--secondary-light').trim();
  const colorAccentLight = rootStyles.getPropertyValue('--accent-light').trim();
  const colorTextDark = rootStyles.getPropertyValue('--text-dark').trim();
  const colorTextGray = rootStyles.getPropertyValue('--text-gray').trim();

  const myColorPalette = [colorSecondary, colorAccent, colorPrimaryLight, colorSecondaryLight, colorAccentLight];
  const colorScale = d3.scaleOrdinal(myColorPalette);

  // ======== D3 Layout & Geometric Arc Configuration ========
  const pie = d3.pie().value(d => d.value).sort(null);
  const arc = d3.arc()
    .innerRadius(radius * 0.58)
    .outerRadius(radius)
    .padAngle(0.03)      
    .cornerRadius(5);    

  const arcHover = d3.arc()
    .innerRadius(radius * 0.54)
    .outerRadius(radius * 1.08)
    .padAngle(0.04)
    .cornerRadius(6);

  const labelArc = d3.arc().innerRadius(radius * 1.18).outerRadius(radius * 1.18);
  const labelArcActive = d3.arc().innerRadius(radius * 1.22).outerRadius(radius * 1.22);
  const arcs = pie(data);

  // Coordinate Calculator: Recomputes 3-point polyline paths dynamically
  function getLinePoints(d, arcGenerator, labelArcGenerator) {
    const posA = arcGenerator.centroid(d);  // Inflection point A: Slice center
    const posB = labelArcGenerator.centroid(d);  // Inflection point B: Intermediate label radius
    const posC = [...posB];  // Point C copy for horizontal anchor extension
    const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
    posC[0] = radius * 1.12 * (midangle < Math.PI ? 1 : -1);  // Direct horizontal extension path based on hemisphere
    return [posA, posB, posC];
  }

  // Translation Calculator: Determines text placement matrices
  function getTextTransform(d, labelArcGenerator) {
    const pos = labelArcGenerator.centroid(d);
    const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
    pos[0] = radius * 1.18 * (midangle < Math.PI ? 1 : -1);
    return `translate(${pos})`;
  }

  const insightContainer = container.append("div")
    .attr("class", "chart-insight-box")
    .style("min-height", "55px")
    .style("margin-top", "10px")
    .style("padding", "8px 12px")
    .style("font-size", "0.95rem")
    .style("line-height", "1.5")
    .style("text-align", "center")
    .style("color", colorTextGray)
    .style("border-top", `1px dashed ${colorTextGray}40`) 
    .style("transition", "all 0.3s ease")
    .html(`<span style="opacity: 0.6; font-style: italic;">// Hover over any chart slice to discover localized market insight telemetry.</span>`);


  // ======== Render Slices with Entrance Animations ========
  mainGroup.selectAll("path")
    .data(arcs)
    .enter()
    .append("path")
    .attr("fill", (d, i) => colorScale(i))
    .style("opacity", 0.85)
    .style("cursor", "pointer")
    // STEP 1: Initialize all slices at 0 angle (invisible)
    .transition()
    .duration(800)
    .delay((d, i) => i * 50)
    .ease(d3.easeCubicOut)
    // STEP 2: Use custom tween interpolator to grow the arcs smoothly
    .attrTween("d", function(d) {
      const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
      return function(t) { return arc(i(t)); };
    })
    // End of entrance animation, safe to bind interactions now
    .end()
    .then(function() {
      // Bind synchronous multi-element interactive hover states
      mainGroup.selectAll("path")
        .on("mouseover", function(event, d) {
          const idx = arcs.indexOf(d);

          // 1. Individual Slice Elastic expansion + Bloom Filter activation
          d3.select(this)
            .transition().duration(300).ease(d3.easeElasticOut)
            .attr("d", arcHover)
            .style("opacity", 1)
            .style("filter", "url(#neon-glow)");

          // 2. Guideline Synchronization: Push endpoints outwards via labelArcActive
          mainGroup.select(`.label-line-${idx}`)
            .transition().duration(300).ease(d3.easeElasticOut)
            .attr("points", getLinePoints(d, arcHover, labelArcActive))
            .style("opacity", 0.85);

          // 3. Text Tag Synchronization: Shift transform matrix + Scale font size + Map native filling color
          mainGroup.select(`.label-text-${idx}`)
            .transition().duration(300).ease(d3.easeElasticOut)
            .attr("transform", getTextTransform(d, labelArcActive))
            .style("font-size", "0.9rem")
            .style("font-weight", "800")
            .style("fill", colorScale(idx)); 

            // 4. Smart Insight Dynamic Branching Engine
            const targetName = d.data.name;
            const currentVal = d.data.value;

            insightContainer
            .style("color", colorTextDark)
            .style("font-weight", "600");

            if (cityKey === "all") {
            // BRANCH 1: NATIONAL OVERVIEW MODE (Show absolute global proportions)
            insightContainer.html(`
              <span style="color: ${colorScale(idx)}; margin-right: 5px;">👥</span>
              In <span style="font-weight: 700;">China</span>, <span style="color: ${colorScale(idx)}; font-weight: 800; font-size: 1.05rem;">${currentVal}%</span> of beverage consumers belong to the <span style="color: ${colorScale(idx)}; font-weight: 700;">${targetName}</span> segment.
            `);

          } else if (nationalAverageCache && nationalAverageCache[chartType]) {
            // BRANCH 2: REGIONAL TIER MODE (Calculate and show baseline variance)
            const nationalItem = nationalAverageCache[chartType].find(item => item.name === targetName);
            const nationalVal = nationalItem ? nationalItem.value : 0;

            const diff = +(currentVal - nationalVal).toFixed(1); 
            const comparisonText = diff >= 0 ? "higher than" : "lower than";
            const absoluteDiff = Math.abs(diff);

            insightContainer.html(`
              <span style="color: ${colorScale(idx)}; margin-right: 5px;">👥</span>
              In <span style="font-weight: 700;">${currentCityLabel}</span>, the consumption share for the <span style="color: ${colorScale(idx)}; font-weight: 700;">${targetName}</span> segment is <span style="color: ${colorScale(idx)}; font-weight: 800; font-size: 1.05rem;">${absoluteDiff}% ${comparisonText}</span> the national average.
            `);
          }
        })
        .on("mouseout", function(event, d) {
          const idx = arcs.indexOf(d);

          // A. Restore Slices
          d3.select(this)
            .transition().duration(200).ease(d3.easeQuadOut)
            .attr("d", arc)
            .style("opacity", 0.85)
            .style("filter", "none");

          // B. Restore Guidelines
          mainGroup.select(`.label-line-${idx}`)
            .transition().duration(200).ease(d3.easeQuadOut)
            .attr("points", getLinePoints(d, arc, labelArc))
            .style("opacity", 0.4);

          // C. Restore Labels
          mainGroup.select(`.label-text-${idx}`)
            .transition().duration(200).ease(d3.easeQuadOut)
            .attr("transform", getTextTransform(d, labelArc))
            .style("font-size", "0.75rem")  
            .style("font-weight", "600")
            .style("fill", colorTextDark);

          // D. Reset to default status bar placeholder
          insightContainer
            .style("color", colorTextGray)
            .style("font-weight", "500")
            .html(`<span style="opacity: 0.6; font-style: italic;">// Hover over any chart slice to discover localized market insight telemetry.</span>`);
        });
    });

     

// ========= 2. Render Dotted Guidelines =========
  mainGroup.selectAll("polyline")
    .data(arcs)
    .enter()
    .append("polyline")
    .attr("class", (d, i) => `label-line-${i}`) 
    .attr("points", d => getLinePoints(d, arc, labelArc))
    .style("fill", "none")
    .style("stroke", colorTextGray)
    .style("stroke-width", "1.5px")
    .style("stroke-dasharray", "3,3")
    .style("opacity", 0)
    .transition().delay(600).duration(400)
    .style("opacity", 0.4);

  // ========= 3. Render Precision Text Labels =========
  mainGroup.selectAll("text")
    .data(arcs)
    .enter()
    .append("text")
    .attr("class", (d, i) => `label-text-${i}`) 
    .text(d => `${d.data.name} (${d.data.value}%)`)
    .attr("transform", d => getTextTransform(d, labelArc))
    .style("text-anchor", d => (d.startAngle + (d.endAngle - d.startAngle) / 2) < Math.PI ? "start" : "end")
    .style("font-family", rootStyles.getPropertyValue('--font-sans').trim() || "sans-serif")
    .style("font-size", "0.75rem") 
    .style("font-weight", "600")
    .style("fill", colorTextDark)
    .style("opacity", 0)
    .transition().delay(600).duration(400)
    .style("opacity", 1);
}


/**
 * Core Renderer 2: Rounded Slider Track + Persistent Index Numbers + Dynamic Bubble Slider Dashboard
 */
function renderTwoTierProductChart(containerId, data) {
  const container = d3.select(containerId);
  container.html(""); // Clear old container contents
  if (!data || data.length === 0) return;
  const rootStyles = getComputedStyle(document.documentElement);
  const colorSecondary = rootStyles.getPropertyValue('--secondary').trim();
  const colorAccent = rootStyles.getPropertyValue('--accent').trim();
  const colorPrimaryLight = rootStyles.getPropertyValue('--primary-light').trim();
  const colorSecondaryLight = rootStyles.getPropertyValue('--ff758f').trim();
  const colorAccentLight = rootStyles.getPropertyValue('--accent-light').trim();
  const colorTextDark = rootStyles.getPropertyValue('--text-dark').trim();
  const colorTextGray = rootStyles.getPropertyValue('--text-gray').trim();
  const customRainbowPalette = [colorSecondary, colorAccent, colorPrimaryLight, colorSecondaryLight, colorAccentLight];

  // 1. Construct the Rounded Rectangular Slider Track
  const controllerWrapper = container.append("div")
    .attr("class", "rank-slider-controller")
    .style("display", "flex")
    .style("justify-content", "center")
    .style("align-items", "center")
    .style("gap", "10px")
    .style("margin", "0 auto 30px auto")
    .style("background", "rgba(0, 0, 0, 0.05)") 
    .style("border", "1px solid rgba(0, 0, 0, 0.08)") 
    .style("padding", "6px 12px")
    .style("border-radius", "30px") 
    .style("width", "fit-content");

  // 2. Create the Content Display Board below the track
  const contentWrapper = container.append("div")
    .attr("class", "rank-display-board"); 

  // 3. Core Dynamic View Toggling Function
  function updateRankView(index) {
    contentWrapper.html(""); // Clear the canvas on view toggle
    
    const prod = data[index];
    if (!prod) return;

    const currentClassColor = customRainbowPalette[index] || colorSecondary;

    // Calculate SVG Dimensions
    const width = contentWrapper.node().getBoundingClientRect().width || 400;
    const height = 68 + (prod.brands.length * 76) + 15;
    
    const svg = contentWrapper.append("svg").attr("width", width).attr("height", height);
    const mainGroup = svg.append("g").attr("transform", `translate(15, 20)`);
    const chartWidth = width - 30;
    const barScale = d3.scaleLinear().domain([0, 30]).range([0, chartWidth * 0.32]);

    // A. Tree-structure Connecting Lines
    let tempY = 68;
    prod.brands.forEach((brand, bIdx) => {
      const lineG = mainGroup.append("g").attr("class", "tree-structure-lines");
      lineG.append("line")
        .attr("x1", 38).attr("y1", 28)
        .attr("x2", 38).attr("y2", tempY + 36)
        .style("stroke", `${colorTextGray}25`).style("stroke-width", "2px");
      lineG.append("line")
        .attr("x1", 38).attr("y1", tempY + 36)
        .attr("x2", 155).attr("y2", tempY + 36)
        .style("stroke", `${colorTextGray}25`).style("stroke-width", "2px");
      tempY += 76;
    });

    // B. TIER 1: Main Category Row
    const productG = mainGroup.append("g").attr("class", "product-type-group");

    productG.append("text")
      .text(`#${index + 1}`)
      .attr("x", 0).attr("y", 38)
      .style("font-size", "1.45rem").style("font-weight", "900").style("fill", currentClassColor);

    const TIER1_IMAGE_SIZE = 96;
    if (prod.illustration) {
      productG.append("clipPath")
        .attr("id", `clip-prod-${index}`)
        .append("circle").attr("cx", 90).attr("cy", 28).attr("r", TIER1_IMAGE_SIZE / 2);

      productG.append("image")
        .attr("href", prod.illustration)
        .attr("x", 90 - TIER1_IMAGE_SIZE / 2).attr("y", 28 - TIER1_IMAGE_SIZE / 2)
        .attr("width", TIER1_IMAGE_SIZE).attr("height", TIER1_IMAGE_SIZE)
        .attr("clip-path", `url(#clip-prod-${index})`);
    }

    const titleTextNode = productG.append("text")
      .text(prod.product_type)
      .attr("x", 155).attr("y", 36)
      .style("font-size", "1.25rem").style("font-weight", "700").style("fill", colorTextDark);

    let measuredTextWidth = 240;
    try { if (titleTextNode.node()) measuredTextWidth = titleTextNode.node().getComputedTextLength(); } catch(e) {}
    const dynamicBarX = 155 + measuredTextWidth + 20;

    productG.append("rect")
      .attr("x", dynamicBarX).attr("y", 18)
      .attr("width", barScale(prod.total_value))
      .attr("height", 22).attr("rx", 11).style("fill", currentClassColor).style("opacity", 0.85);

    productG.append("text")
      .text(`${prod.total_value}%`)
      .attr("x", dynamicBarX + 15 + barScale(prod.total_value)).attr("y", 35)
      .style("font-size", "1.15rem").style("font-weight", "800").style("fill", currentClassColor);

    // C. TIER 2: Sub-Brand Breakdown Rows
    let currentY = 68;
    prod.brands.forEach((brand, bIdx) => {
      const brandG = mainGroup.append("g")
        .attr("transform", `translate(165, ${currentY})`)
        .attr("class", "brand-sub-row");

      const TIER2_LOGO_SIZE = 72;
      if (brand.logo) {
        brandG.append("clipPath")
          .attr("id", `clip-brand-${index}-${bIdx}`)
          .append("circle").attr("cx", TIER2_LOGO_SIZE / 2).attr("cy", 36).attr("r", TIER2_LOGO_SIZE / 2);

        brandG.append("image")
          .attr("href", brand.logo)
          .attr("x", 0).attr("y", 0)
          .attr("width", TIER2_LOGO_SIZE).attr("height", TIER2_LOGO_SIZE)
          .attr("clip-path", `url(#clip-brand-${index}-${bIdx})`);
      }

      const brandTextNode = brandG.append("text")
        .text(`${bIdx + 1}. ${brand.name}`)
        .attr("x", 85).attr("y", 42)
        .style("font-size", "1.1rem").style("font-weight", "600").style("fill", colorTextDark);

      let measuredBrandWidth = 100;
      try { if (brandTextNode.node()) measuredBrandWidth = brandTextNode.node().getComputedTextLength(); } catch(e) {}
      const dynamicBrandBarX = 85 + measuredBrandWidth + 15;
      const absoluteBrandValue = brand.value * (prod.total_value / 100);

      brandG.append("rect")
        .attr("x", dynamicBrandBarX).attr("y", 29)
        .attr("width", barScale(absoluteBrandValue))
        .attr("height", 14).attr("rx", 7).style("fill", currentClassColor).style("opacity", 0.45);

      brandG.append("text")
        .text(`${brand.value}%`)
        .attr("x", dynamicBrandBarX + 10 + barScale(absoluteBrandValue)).attr("y", 41)
        .style("font-size", "1.0rem").style("font-weight", "600").style("fill", colorTextGray);

      currentY += 76;
    });

    // D. Reset Styles of Inactive Slider Items
    controllerWrapper.selectAll(".slider-step-item")
      .style("background", "transparent")
      .style("color", "rgba(0, 0, 0, 0.4)")
      .style("font-weight", "600")
      .style("transform", "scale(1.0)")
      .style("box-shadow", "none");

    // Highlight the Active Item
    controllerWrapper.select(`.step-id-${index}`)
      .style("background", currentClassColor)
      .style("color", "#ffffff")
      .style("font-weight", "800")
      .style("transform", "scale(1.1)")
      .style("box-shadow", `0 3px 12px ${currentClassColor}60`);
  }

  // 4. Initialize and render numbers 1-5 inside the slider track
  data.forEach((prod, idx) => {
    controllerWrapper.append("div")
      .attr("class", `slider-step-item step-id-${idx}`)
      .style("cursor", "pointer")
      .style("display", "flex")
      .style("justify-content", "center")
      .style("align-items", "center")
      .style("width", "36px")
      .style("height", "36px")
      .style("border-radius", "50%")
      .style("font-family", "system-ui, sans-serif")
      .style("font-size", "1.1rem")
      .style("transition", "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)")
      .html(`<span>${idx + 1}</span>`)
      .on("mouseenter", function() {
        updateRankView(idx);
      });
  });

  updateRankView(0);

  container.append("div")
    .style("margin-top", "35px")
    .style("padding", "16px 18px")
    .style("font-size", "1rem")
    .style("line-height", "1.6")
    .style("text-align", "left")
    .style("color", colorTextDark)
    .style("background", `${colorTextGray}08`)
    .style("border-radius", "8px")
    .style("border-left", `4px solid ${colorSecondary}`) 
    .html(`
      <div style="font-weight: 800; font-size: 1.5rem; margin-bottom: 8px; color: ${colorSecondary};">Market Intelligence Insights</div>
      <p style="margin: 0 0 8px 0; color: ${colorTextDark}; font-size: 1.05rem;">
      The data highlights a clear preference in the beverage market: 
      <span style="font-weight: 700;">Low-Sugar Tea Drinks</span> &gt; 
      <span style="font-weight: 700;">Fruit Tea</span> &gt; 
      <span style="font-weight: 700;">Light Milk Tea</span> &gt; 
      <span style="font-weight: 700;">Oat Milk Tea</span> &gt; 
      <span style="font-weight: 700;">Milk Tea / Cheese Foam / Others</span>.
    </p>
    <p style="margin: 0; color: ${colorTextGray}; font-size: 0.95rem; line-height: 1.6;">
  This ranking directly reflects a massive shift in Chinese consumer habits toward <strong>healthier diets, lower sugar, and reduced fat</strong>. To give you a closer look at who is leading this change, we have also mapped out the top 5 bestselling brands in each category to reveal the current competitive landscape.
  </p>
    `);
}

/**
 * Section Charts Integration Manager
 */
function updateSectionCharts(jsonData, cityKey) {
  const cityData = jsonData[cityKey];
  if (!cityData) return;
  const labelMapping = {
    "all": "National Baseline",
    "tier1": "Tier 1 Cities",
    "tier2": "Tier 2 Cities",
    "tier3": "Tier 3 Cities"
  };
  const currentCityLabel = labelMapping[cityKey] || "This Region";

  renderPieChart("#scenario-chart", cityData.scenario, "scenario", currentCityLabel, cityKey);
  renderPieChart("#motive-chart", cityData.motive, "motive", currentCityLabel, cityKey);
  renderPieChart("#age-distribution", cityData.age, "age", currentCityLabel, cityKey);
  renderPieChart("#gender-chart", cityData.gender, "gender", currentCityLabel, cityKey);

  // Directly reads the product popularity ranking data pre-loaded and cached independently on the initial load, 
  // keeping it entirely decoupled from city filter button toggles.
  if (globalProductDataCache) {
    renderTwoTierProductChart("#product-type-chart", globalProductDataCache);
  }
}


/**
 * Core Initialization Endpoint called by main.js
 */
export function listenToConsumerBehaviorEvent() {
  Promise.all([
    d3.json(CITY_DATA_PATH),
    d3.json(POPULARITY_DATA_PATH) 
  ])
  .then(([loadedCityData, loadedProductData]) => { 
    // 1. Cache the national baseline comparison reference required by the first four conventional pie charts
    nationalAverageCache = loadedCityData["all"];
    // 2. Extract the raw sorted array out of the 'product_popularity' wrapper object and inject it into the global cache
    globalProductDataCache = loadedProductData.product_popularity;
    // 3. Trigger initial view render for first-screen data display
    updateSectionCharts(loadedCityData, "all");
    // 4. Bind and handle interactive Filter button switching logic
    const filterButtons = document.querySelectorAll(".filter-button");
    filterButtons.forEach(button => {
      button.addEventListener("click", (e) => {
        filterButtons.forEach(btn => btn.classList.remove("active"));
        e.target.classList.add("active");
        const targetFilter = e.target.getAttribute("data-filter");
        updateSectionCharts(loadedCityData, targetFilter);
      });
    });
  })
  .catch(error => {
    console.error("Failed to load global consumer behavior async datasets: ", error);
  });
}



