import * as d3 from "d3";

const TREE_SELECTOR = "#decision-tree-chart";

const NODE_RADIUS = 7;
const NODE_VERTICAL_GAP = 72;
const NODE_HORIZONTAL_GAP = 220;

const productColor = d3.scaleOrdinal(d3.schemeTableau10);

export function renderTree(treeData, highlightedPath = []) {
  const container = document.querySelector(TREE_SELECTOR);

  if (!container) return;

  container.innerHTML = "";

  const root = d3.hierarchy(treeData.root, (node) => node.children);

  const layout = d3.tree().nodeSize([NODE_VERTICAL_GAP, NODE_HORIZONTAL_GAP]);
  layout(root);

  const nodes = root.descendants();
  const links = root.links();

  const xValues = nodes.map((node) => node.x);
  const yValues = nodes.map((node) => node.y);

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const maxY = Math.max(...yValues);

  const width = Math.max(container.clientWidth || 900, maxY + 360);
  const height = Math.max(520, maxX - minX + 140);

  const highlighted = new Set(highlightedPath);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("role", "img")
    .attr("aria-label", "Decision tree visualization");

  const viewport = svg.append("g");

  const initialTransform = d3.zoomIdentity.translate(90, -minX + 70);

  const zoom = d3
    .zoom()
    .scaleExtent([0.45, 2.2])
    .on("zoom", (event) => {
      viewport.attr("transform", event.transform);
    });

  svg.call(zoom);
  svg.call(zoom.transform, initialTransform);

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
      highlighted.has(link.source.data.id) && highlighted.has(link.target.data.id)
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
    .attr("transform", (node) => `translate(${node.y},${node.x})`);

  nodeGroups
    .append("circle")
    .attr("r", NODE_RADIUS)
    .attr("fill", (node) => getNodeColor(node.data))
    .attr("stroke-width", 2);

  nodeGroups
    .append("text")
    .attr("class", "tree-node-title")
    .attr("x", 14)
    .attr("y", -5)
    .text((node) => getNodeTitle(node.data));

  nodeGroups
    .append("text")
    .attr("class", "tree-node-subtitle")
    .attr("x", 14)
    .attr("y", 13)
    .text((node) => `${node.data.samples.toLocaleString()} orders`);

  nodeGroups
    .append("title")
    .text((node) => getTooltipText(node.data));
}

function getNodeTitle(node) {
  if (node.type === "leaf") {
    return node.model_prediction ?? node.prediction ?? "Leaf";
  }

  return node.question ?? "Split";
}

function getNodeColor(node) {
  if (node.type === "leaf") {
    return productColor(node.model_prediction ?? node.prediction ?? "leaf");
  }

  return "#ffffff";
}

function getTooltipText(node) {
  const title = getNodeTitle(node);
  const observed = node.observed_prediction
    ? `Observed top choice: ${node.observed_prediction}`
    : "";

  return `${title}
Samples: ${node.samples}
${observed}`;
}
