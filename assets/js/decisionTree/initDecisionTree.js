import { DECISION_TREE_DATA_PATH } from "../constants/consts.js";
import { loadDecisionTree } from "./loadTree.js";
import { renderResult } from "./renderResult.js";
import { renderTree } from "./renderTree.js";
import { traverseTree } from "./traverseTree.js";

const FORM_SELECTOR = "#recommendation-form";

export async function initDecisionTree() {
  const form = document.querySelector(FORM_SELECTOR);

  if (!form) return;

  try {
    const treeData = await loadDecisionTree(DECISION_TREE_DATA_PATH);

    function updateTree(event) {
      event?.preventDefault();

      const answers = getFormAnswers(form);
      const result = traverseTree(treeData.root, answers);

      renderTree(treeData, result.path);
      renderResult(result, treeData.metadata);
    }

    form.addEventListener("submit", updateTree);
    form.addEventListener("change", updateTree);

    updateTree();
  } catch (error) {
    console.error(error);

    const container = document.querySelector("#decision-tree-chart");
    if (container) {
      container.innerHTML = `
        <p class="tree-error">
          Could not load the decision tree visualization.
        </p>
      `;
    }
  }
}

function getFormAnswers(form) {
  const formData = new FormData(form);

  return {
    city_level: formData.get("city_level"),
    age_group: formData.get("age_group"),
    gender: formData.get("gender"),
    motive: formData.get("motive"),
    scenario: formData.get("scenario"),
    budget_band: formData.get("budget_band"),
  };
}
