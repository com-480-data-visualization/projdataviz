import { DECISION_TREE_DATA_PATH } from "../constants/consts.js";
import { loadDecisionTree } from "./loadTree.js";
import { renderEmptyResult, renderResult } from "./renderResult.js";
import { renderTree } from "./renderTree.js";
import { traverseTree } from "./traverseTree.js";

const FORM_SELECTOR = "#recommendation-form";

export async function initDecisionTree() {
  const form = document.querySelector(FORM_SELECTOR);

  if (!form) return;

  const generateButton = form.querySelector(".tree-generate-button");

  try {
    const treeData = await loadDecisionTree(DECISION_TREE_DATA_PATH);

    // Render the full tree on page load, but do not calculate a recommendation yet.
    renderTree(treeData);
    renderEmptyResult();
    updateGenerateButtonState(form, generateButton);

    form.addEventListener("change", () => {
      updateGenerateButtonState(form, generateButton);
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        updateGenerateButtonState(form, generateButton);
        return;
      }

      const answers = getFormAnswers(form);
      const result = traverseTree(treeData.root, answers);

      renderTree(treeData, result.path);
      renderResult(result, treeData.metadata);

      form.reset();
      updateGenerateButtonState(form, generateButton);
    });
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

function updateGenerateButtonState(form, button) {
  if (!button) return;

  const hasAnyInput = hasAnySelection(form);
  const isComplete = isFormComplete(form);

  button.hidden = !hasAnyInput;
  button.disabled = !isComplete;
}

function hasAnySelection(form) {
  return Boolean(form.querySelector("input[type='radio']:checked"));
}

function isFormComplete(form) {
  const requiredGroups = [
    "city_level",
    "age_group",
    "gender",
    "motive",
    "scenario",
    "budget_band",
  ];

  return requiredGroups.every((name) => {
    return Boolean(form.querySelector(`input[name="${name}"]:checked`));
  });
}
