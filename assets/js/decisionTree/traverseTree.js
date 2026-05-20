export function traverseTree(rootNode, answers) {
  const path = [];
  let currentNode = rootNode;

  while (currentNode) {
    path.push(currentNode.id);

    if (currentNode.type === "leaf" || !currentNode.children?.length) {
      return {
        leaf: currentNode,
        path,
      };
    }

    const { feature, value } = currentNode.condition;
    const userValue = answers[feature];

    const branch = userValue === value ? "yes" : "no";

    currentNode = currentNode.children.find((child) => child.branch === branch);
  }

  return {
    leaf: null,
    path,
  };
}
