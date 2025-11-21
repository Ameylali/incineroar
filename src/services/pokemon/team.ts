import { PokemonSet, Sets } from '@pkmn/sets';

export default class TeamService {
  parseTeam(rawTeam: string): Partial<PokemonSet>[] {
    const pokes = rawTeam.split('\n\n');
    return pokes.map((poke) => Sets.importSet(poke));
  }
}
