export const CARD_MATERIALS = [
  { id: 'classic', name: 'Classic' },
  { id: 'plush', name: 'Plush' },
  { id: 'felt', name: 'Wool felt' },
  { id: 'glass', name: 'Liquid glass' },
  { id: 'mirror', name: 'Mirror' },
  { id: 'gold', name: 'Gold foil' },
  { id: 'holo', name: 'Holographic foil' },
] as const;

export type CardMaterialId = (typeof CARD_MATERIALS)[number]['id'];
