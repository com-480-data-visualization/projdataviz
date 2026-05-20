export async function loadDecisionTree(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load decision tree JSON: ${response.status}`);
  const tree = await response.json();
  if (!tree.root) throw new Error("Decision tree JSON is missing the root node.");
  return tree;
}
