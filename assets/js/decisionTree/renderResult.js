const RESULT_SELECTOR = "#recommendation-result";

export function renderEmptyResult() {
  const container = document.querySelector(RESULT_SELECTOR);

  if (!container) return;

  container.innerHTML = `
    <p class="tree-muted">
      Choose your profile and generate a drink suggestion.
    </p>
  `;
}

export function renderResult(result, metadata) {
  const container = document.querySelector(RESULT_SELECTOR);

  if (!container) return;

  if (!result?.leaf) {
    container.innerHTML = `
      <p class="tree-muted">No matching profile was found.</p>
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
    .filter((row) => row.share > 0)
    .sort((a, b) => b.share - a.share);

  const topBrands = leaf.top_brands ?? [];
  const profileShare = getProfileShare(leaf, metadata);

  container.innerHTML = `
    <div class="tree-profile-size">
      Your profile matches about <strong>${profileShare}%</strong> of the orders in this dataset.
    </div>
    <div class="tree-result-grid">
      <div class="tree-result-main">
        <p class="tree-result-label">Recommended for your profile</p>
        <p class="tree-result-value">
          ${escapeHtml(cleanProductName(leaf.model_prediction ?? leaf.prediction))}
        </p>
      </div>

      <div class="tree-result-block">
        <p class="tree-result-label">Most ordered by similar consumers</p>
        <p class="tree-result-secondary">
          ${escapeHtml(cleanProductName(leaf.observed_prediction ?? "N/A"))}
        </p>
      </div>
    </div>


    <div class="tree-result-details">
      <div class="tree-mini-section">
        <h4>What similar consumers ordered</h4>
        <div class="tree-bars">
          ${distributionRows.map(renderDistributionBar).join("")}
        </div>
      </div>

      <div class="tree-mini-section">
        <h4>Brands popular in this profile</h4>
        ${
          topBrands.length > 0
            ? `<ol class="tree-brand-list">
                ${topBrands.map(renderBrandItem).join("")}
              </ol>`
            : `<p class="tree-muted">No brand data available.</p>`
        }
      </div>
    </div>
  `;
}

function getProfileShare(leaf, metadata) {
  const total = Number(metadata?.training_samples ?? 0);
  const samples = Number(leaf.samples ?? 0);

  if (!total || !samples) return 0;

  return Math.max(1, Math.round((samples / total) * 100));
}

function renderDistributionBar(row) {
  const percent = Math.round(row.share * 100);

  return `
    <div class="tree-bar-row">
      <div class="tree-bar-label">${escapeHtml(cleanProductName(row.className))}</div>
      <div class="tree-bar-track" aria-hidden="true">
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

function cleanProductName(value) {
  const labels = {
    "Milk Tea / Cheese Foam / Others": "Milk Tea + Foam",
    "Low-Sugar Tea Drinks": "Low-Sugar Tea",
    "Light Milk Tea": "Light Milk Tea",
    "Oat Milk Tea": "Oat Milk Tea",
    "Fruit Tea": "Fruit Tea",
  };

  return labels[value] ?? String(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
