import { PokemonSet, Sets } from '@pkmn/sets';

import { normalizeSpeciesName } from '@/src/utils/string';

export default class TeamService {
  parseTeam(rawTeam: string): Partial<PokemonSet>[] {
    const pokes = rawTeam.split(/\r\n\r\n|\n\n|\r\r/);
    return pokes.map((poke) => {
      const set = Sets.importSet(poke);
      return set
        ? {
            ...set,
            species: set.species
              ? normalizeSpeciesName(set.species)
              : set.species,
          }
        : set;
    });
  }

  encodeTeam(team: Partial<PokemonSet>[]): string {
    const pokes = team.map((set) => Sets.exportSet(set));
    return pokes.join('').slice(0, -4);
  }
}
