import { AUSTIN_TRAILS, Trail } from './austinTrails';

/**
 * Species catalogue.
 *
 * Derived from the plants and animals already listed on each trail, so there
 * is exactly one place to edit wildlife data — the trail itself. Adding a
 * species to a trail automatically adds it to the checklist, and no entry can
 * exist that isn't findable somewhere.
 *
 * This is why the checklist can never go stale: it is not a second list, it is
 * a view of the first one.
 */

export type SpeciesKind = 'plant' | 'animal';

export type Species = {
  id: string;
  name: string;
  kind: SpeciesKind;
  /** Trails where this species is listed. Never empty. */
  trailIds: string[];
};

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildCatalogue(trails: Trail[]): Species[] {
  const byId = new Map<string, Species>();

  const add = (name: string, kind: SpeciesKind, trailId: string) => {
    const id = slug(name);
    const existing = byId.get(id);
    if (existing) {
      if (!existing.trailIds.includes(trailId)) existing.trailIds.push(trailId);
      return;
    }
    byId.set(id, { id, name, kind, trailIds: [trailId] });
  };

  for (const trail of trails) {
    trail.plants?.forEach((p) => add(p, 'plant', trail.id));
    trail.animals?.forEach((a) => add(a, 'animal', trail.id));
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const SPECIES: Species[] = buildCatalogue(AUSTIN_TRAILS);

export const SPECIES_BY_ID = new Map(SPECIES.map((s) => [s.id, s]));

export const TOTAL_SPECIES = SPECIES.length;
export const TOTAL_PLANTS = SPECIES.filter((s) => s.kind === 'plant').length;
export const TOTAL_ANIMALS = SPECIES.filter((s) => s.kind === 'animal').length;

/** Species listed for one trail, plants first then animals, alphabetical. */
export function speciesForTrail(trailId: string): Species[] {
  return SPECIES.filter((s) => s.trailIds.includes(trailId)).sort(
    (a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)
  );
}

/** Trail objects a species can be found on, for the "where to look" hint. */
export function trailsForSpecies(speciesId: string): Trail[] {
  const species = SPECIES_BY_ID.get(speciesId);
  if (!species) return [];
  return AUSTIN_TRAILS.filter((t) => species.trailIds.includes(t.id));
}

/**
 * Rarity is simply how few trails list it. A species on one trail is a real
 * find; one on eight trails is not.
 */
export function rarityLabel(species: Species): 'Common' | 'Uncommon' | 'Rare' {
  if (species.trailIds.length >= 4) return 'Common';
  if (species.trailIds.length >= 2) return 'Uncommon';
  return 'Rare';
}
