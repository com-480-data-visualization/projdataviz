const RESULT_SELECTOR = "#recommendation-result";

export function renderResult(result, metadata) {
  const container = document.querySelector(RESULT_SELECTOR);

  if (!container) return;

  if (!result?.leaf) {
    container.innerHTML = `
      <p class="tree-muted">No matching leaf was found.</p>
    `;
    return;
  }

  const leaf = result.leaf;
  const classes = metadata?.classes ?? Object.keys(leaf.class_distribution ?? {});

  const distributionRows = classes
    .map((className) => ({
      className,
      share: leaf.class_distribution?.[className] ?? 0,
    }))
    .sort((a, b) => b.share - a.share);

  const topBrands = leaf.top_brands ?? [];

  container.innerHTML = `
    <div class="tree-result-main">
      <p class="tree-result-label">Tree suggestion</p>
      <p class="tree-result-value">${escapeHtml(leaf.model_prediction ?? leaf.prediction)}</p>
    </div>

    <div class="tree-result-meta">
      <span>${leaf.samples.toLocaleString()} orders in this leaf</span>
      <span>Observed top choice: ${escapeHtml(leaf.observed_prediction ?? "N/A")}</span>
    </div>

    <div class="tree-mini-section">
      <h4>Observed product distribution</h4>
      <div class="tree-bars">
        ${distributionRows.map(renderDistributionBar).join("")}
      </div>
    </div>

    <div class="tree-mini-section">
      <h4>Top brands in this leaf</h4>
      ${
        topBrands.length > 0
          ? `<ol class="tree-brand-list">
              ${topBrands.map(renderBrandItem).join("")}
            </ol>`
          : `<p class="tree-muted">No brand data available.</p>`
      }
    </div>

    <p class="tree-note">
      The tree suggestion comes from the balanced decision tree. The bars show
      the real observed distribution inside the selected branch.
    </p>
  `;
}

function renderDistributionBar(row) {
  const percent = Math.round(row.share * 100);

  return `
    <div class="tree-bar-row">
      <div class="tree-bar-label">${escapeHtml(row.className)}</div>
      <div class="tree-bar-track">
        <div class="tree-bar-fill" style="width: ${percent}%"></div>
      </div>
      <div class="tree-bar-value">${percent}%</div>
    </div>
  `;
}

function renderBrandItem(item) {
  const percent = Math.round((item.share ?? 0) * 100);

  return `
    <li>
      <span>${escapeHtml(item.brand)}</span>
      <strong>${percent}%</strong>
    </li>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
