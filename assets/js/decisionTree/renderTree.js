import * as d3 from "d3";

const TREE_SELECTOR = "#decision-tree-chart";

const NODE_RADIUS = 34;
const NODE_VERTICAL_GAP = 165;
const NODE_HORIZONTAL_GAP = 480;
const TREE_MARGIN = 130;
const TITLE_FONT_SIZE = 40;
const SUBTITLE_FONT_SIZE = 26;
const TITLE_X_OFFSET = 56;
const TITLE_Y_OFFSET = -16;
const SUBTITLE_X_OFFSET = 56;
const SUBTITLE_Y_OFFSET = 32;

const productColor = d3.scaleOrdinal(d3.schemeTableau10);

const FEATURE_LABELS = {
  city_level: "City",
  age_group: "Age",
  gender: "Gender",
  motive: "Motive",
  scenario: "Scenario",
  budget_band: "Budget",
};

const VALUE_LABELS = {
  "1st-tier": "Tier 1",
  "2nd-tier": "Tier 2",
  "3rd-tier": "Tier 3",
  "Over 45": "45+",
  "Dine-in": "Dine in",
  "Pick-up": "Pick up",
};

const PRODUCT_LABELS = {
  "Milk Tea / Cheese Foam / Others": "Milk Tea + Foam",
  "Low-Sugar Tea Drinks": "Low-Sugar Tea",
  "Light Milk Tea": "Light Milk Tea",
  "Oat Milk Tea": "Oat Milk Tea",
  "Fruit Tea": "Fruit Tea",
};

export function renderTree(treeData, highlightedPath = []) {
  const container = document.querySelector(TREE_SELECTOR);

  if (!container) return;

  container.innerHTML = "";

  const root = d3.hierarchy(treeData.root, (node) => node.children);

  d3.tree().nodeSize([NODE_VERTICAL_GAP, NODE_HORIZONTAL_GAP])(root);

  const nodes = root.descendants();
  const links = root.links();

  const xValues = nodes.map((node) => node.x);
  const yValues = nodes.map((node) => node.y);

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const containerWidth = container.clientWidth || 1100;
  const treeHeight = maxX - minX + TREE_MARGIN * 2;

  // Keep the SVG viewport equal to the visible container width.
  // The tree itself can extend beyond the viewport and be explored with pan/zoom.
  // This prevents the full tree from being scaled down and keeps labels readable.
  const width = containerWidth;
  const height = Math.max(820, treeHeight);

  const highlighted = new Set(highlightedPath);
  const totalSamples = Number(treeData.metadata?.training_samples ?? 0);
  const tooltip = createTooltip();

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("role", "img")
    .attr("aria-label", "Decision tree visualization")
    .style("touch-action", "none")
    .style("-webkit-tap-highlight-color", "transparent");

  const viewport = svg.append("g");

  const treeCenterX = (minY + maxY) / 2;
  const treeCenterY = (minX + maxX) / 2;
  const viewportCenterX = width / 2;
  const viewportCenterY = height / 2;

  const initialTransform = d3.zoomIdentity.translate(
    viewportCenterX - treeCenterX,
    viewportCenterY - treeCenterY
  );

  const zoom = d3
    .zoom()
    .scaleExtent([0.25, 2.8])
    .on("zoom", (event) => {
      viewport.attr("transform", event.transform);
    });

  svg.call(zoom);
  svg.call(zoom.transform, initialTransform);

  svg.on("click", () => hideTooltip(tooltip));

  const linkGenerator = d3
    .linkHorizontal()
    .x((node) => node.y)
    .y((node) => node.x);

  viewport
    .append("g")
    .attr("class", "tree-links")
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("class", (link) =>
      isHighlightedLink(link, highlighted)
        ? "tree-link tree-link-active"
        : "tree-link"
    )
    .attr("d", linkGenerator);

  const nodeGroups = viewport
    .append("g")
    .attr("class", "tree-nodes")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .attr("class", (node) => {
      const classes = ["tree-node"];

      if (node.data.type === "leaf") classes.push("tree-node-leaf");
      if (highlighted.has(node.data.id)) classes.push("tree-node-active");

      return classes.join(" ");
    })
    .attr("transform", (node) => `translate(${node.y},${node.x})`)
    .on("mouseenter", (event, node) => showTooltip(event, node.data, tooltip, totalSamples))
    .on("mousemove", (event, node) => showTooltip(event, node.data, tooltip, totalSamples))
    .on("mouseleave", () => hideTooltip(tooltip))
    .on("click", (event, node) => {
      event.stopPropagation();
      showTooltip(event, node.data, tooltip, totalSamples);
    });

  nodeGroups
    .append("circle")
    .attr("r", NODE_RADIUS)
    .attr("fill", (node) => getNodeColor(node.data));

  nodeGroups
    .append("text")
    .attr("class", "tree-node-title")
    .attr("x", TITLE_X_OFFSET)
    .attr("y", TITLE_Y_OFFSET)
    .attr("font-size", TITLE_FONT_SIZE)
    .attr("font-weight", 850)
    .style("pointer-events", "none")
    .text((node) => getNodeTitle(node.data));

  nodeGroups
    .append("text")
    .attr("class", "tree-node-subtitle")
    .attr("x", SUBTITLE_X_OFFSET)
    .attr("y", SUBTITLE_Y_OFFSET)
    .attr("font-size", SUBTITLE_FONT_SIZE)
    .attr("font-weight", 650)
    .style("pointer-events", "none")
    .text((node) => getNodeSubtitle(node.data));
}

function isHighlightedLink(link, highlighted) {
  return (
    highlighted.has(link.source.data.id) &&
    highlighted.has(link.target.data.id)
  );
}

function getNodeTitle(node) {
  if (node.type === "leaf") {
    return cleanProductName(node.model_prediction ?? node.prediction ?? "Drink");
  }

  return getFriendlyCondition(node);
}

function getNodeSubtitle(node) {
  if (node.type === "leaf") {
    const share = Math.round(
      (node.observed_dominant_share ?? node.dominant_share ?? 0) * 100
    );

    return `${share}% top choice`;
  }

  const samples = Number(node.samples ?? 0);
  return `${samples.toLocaleString()} profiles`;
}

function getFriendlyCondition(node) {
  const feature = node.condition?.feature;
  const value = node.condition?.value;

  const featureLabel = FEATURE_LABELS[feature] ?? "Profile";
  const valueLabel = VALUE_LABELS[value] ?? value;

  return `${valueLabel} ${featureLabel}`;
}

function cleanProductName(value) {
  return PRODUCT_LABELS[value] ?? String(value);
}

function getNodeColor(node) {
  if (node.type === "leaf") {
    return productColor(node.model_prediction ?? node.prediction ?? "leaf");
  }

  return "#ffffff";
}

function createTooltip() {
  const existingTooltip = document.querySelector(".tree-tooltip");

  if (existingTooltip) {
    existingTooltip.remove();
  }

  const tooltip = document.createElement("div");
  tooltip.className = "tree-tooltip";
  tooltip.setAttribute("role", "tooltip");

  document.body.appendChild(tooltip);

  return tooltip;
}

function showTooltip(event, node, tooltip, totalSamples) {
  tooltip.innerHTML = getTooltipMarkup(node, totalSamples);

  const tooltipWidth = 280;
  const tooltipHeight = 170;
  const padding = 16;

  let left = event.clientX + 16;
  let top = event.clientY + 16;

  if (left + tooltipWidth > window.innerWidth - padding) {
    left = event.clientX - tooltipWidth - 16;
  }

  if (top + tooltipHeight > window.innerHeight - padding) {
    top = event.clientY - tooltipHeight - 16;
  }

  left = Math.max(padding, left);
  top = Math.max(padding, top);

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.classList.add("visible");
}

function hideTooltip(tooltip) {
  tooltip.classList.remove("visible");
}

function getTooltipMarkup(node, totalSamples) {
  const title = getNodeTitle(node);
  const samples = Number(node.samples ?? 0);
  const profileShare = getProfileShare(samples, totalSamples);

  if (node.type === "leaf") {
    const suggestedDrink = cleanProductName(node.model_prediction ?? node.prediction ?? "Drink");
    const commonDrink = cleanProductName(node.observed_prediction ?? "N/A");

    const observedShare = Math.round(
      (node.observed_dominant_share ?? 0) * 100
    );

    return `
      <div class="tree-tooltip-title">${escapeHtml(title)}</div>
      <div class="tree-tooltip-text">
        This final group represents about <strong>${profileShare}%</strong>
        of all orders.
      </div>
      <div class="tree-tooltip-row">
        <span>Tree suggests</span>
        <strong>${escapeHtml(suggestedDrink)}</strong>
      </div>
      <div class="tree-tooltip-row">
        <span>Most ordered</span>
        <strong>${escapeHtml(commonDrink)}</strong>
      </div>
      <div class="tree-tooltip-row">
        <span>Top choice share</span>
        <strong>${observedShare}%</strong>
      </div>
    `;
  }

  return `
    <div class="tree-tooltip-title">${escapeHtml(title)}</div>
    <div class="tree-tooltip-text">
      About <strong>${profileShare}%</strong> of all orders pass through this group.
    </div>
    <div class="tree-tooltip-row">
      <span>Split rule</span>
      <strong>${escapeHtml(getReadableSplit(node))}</strong>
    </div>
  `;
}

function getProfileShare(samples, totalSamples) {
  if (!totalSamples || !samples) return 0;

  return Math.max(1, Math.round((samples / totalSamples) * 100));
}

function getReadableSplit(node) {
  const feature = node.condition?.feature;
  const value = node.condition?.value;

  const featureLabel = FEATURE_LABELS[feature] ?? "Profile";
  const valueLabel = VALUE_LABELS[value] ?? value;

  return `${featureLabel} is ${valueLabel}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
