/** Tool-gated world harvesting through the attack button. */
const AXES = ['stone_axe', 'copper_axe', 'iron_axe'] as const;
const PICKS = ['stone_pick', 'copper_pick', 'iron_pick'] as const;

export type AxeId = (typeof AXES)[number];
export type PickId = (typeof PICKS)[number];

export function isAxe(baseId: string | null | undefined): baseId is AxeId {
  return AXES.includes(baseId as AxeId);
}

export function isPick(baseId: string | null | undefined): baseId is PickId {
  return PICKS.includes(baseId as PickId);
}

/** The basic tool that unlocks a node type; stronger tiers are accepted too. */
export function chopToolFor(nodeType: string): 'stone_axe' | null {
  return nodeType === 'tree' ? 'stone_axe' : null;
}

export function canChop(selectedBaseId: string | null, nodeType: string): boolean {
  return nodeType === 'tree' && isAxe(selectedBaseId);
}
