/**
 * Veritree integration stub.
 *
 * In production this would POST to Veritree's planting API with an
 * authenticated organization token. For now we expose a typed function
 * that the app calls when an activity completes — easy to swap with a
 * real fetch() once the partner key is provisioned.
 *
 * Docs: https://www.veritree.com/
 */

export type PlantingRequest = {
  userId: string;
  activityId: string;
  trees: number;
  miles: number;
  activityType: 'hike' | 'bike';
  location: 'Austin, TX';
};

export type PlantingReceipt = {
  receiptId: string;
  trees: number;
  treeSpecies: string;
  plantedAt: string;
  partner: 'Veritree';
};

const AUSTIN_NATIVE_SPECIES = [
  'Texas Live Oak',
  'Cedar Elm',
  'Mexican Plum',
  'Bald Cypress',
  'Texas Redbud',
  'Anacacho Orchid Tree',
];

export async function commitPlanting(
  req: PlantingRequest
): Promise<PlantingReceipt> {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 600));

  const species =
    AUSTIN_NATIVE_SPECIES[
      Math.floor(Math.random() * AUSTIN_NATIVE_SPECIES.length)
    ];

  return {
    receiptId: `VT-${Date.now().toString(36).toUpperCase()}`,
    trees: req.trees,
    treeSpecies: species,
    plantedAt: new Date().toISOString(),
    partner: 'Veritree',
  };
}
