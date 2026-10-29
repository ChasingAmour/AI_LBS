/** Crops that can be planted in a farm plot. */
export interface CropDef {
  seedId: string;
  name: string;
  /** growth points needed to ripen */
  growPoints: number;
  yield: { baseId: string; min: number; max: number };
}

export const CROPS: Record<string, CropDef> = {
  berries: {
    seedId: 'berries',
    name: '浆果',
    growPoints: 4,
    yield: { baseId: 'berries', min: 3, max: 5 },
  },
  coconut: {
    seedId: 'coconut',
    name: '椰子',
    growPoints: 6,
    yield: { baseId: 'coconut', min: 2, max: 3 },
  },
};

export function cropDef(seedId: string): CropDef | null {
  return CROPS[seedId] ?? null;
}
