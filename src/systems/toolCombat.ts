/** Tool-gated world harvesting through the attack button. */
export function chopToolFor(nodeType: string): 'stone_axe' | null {
  return nodeType === 'tree' ? 'stone_axe' : null;
}

export function canChop(selectedBaseId: string | null, nodeType: string): boolean {
  const tool = chopToolFor(nodeType);
  return tool !== null && selectedBaseId === tool;
}
