/** Tool-gated world harvesting through the attack button. */
export function isAxe(baseId: string | null | undefined): boolean {
  return baseId === 'stone_axe' || baseId === 'iron_axe';
}

/** The basic tool that unlocks a node type; stronger tiers are accepted too. */
export function chopToolFor(nodeType: string): 'stone_axe' | null {
  return nodeType === 'tree' ? 'stone_axe' : null;
}

export function canChop(selectedBaseId: string | null, nodeType: string): boolean {
  return nodeType === 'tree' && isAxe(selectedBaseId);
}
