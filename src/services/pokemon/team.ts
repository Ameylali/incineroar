import { PokemonSet, Sets } from '@pkmn/sets';

export default class TeamService {
  parseTeam(rawTeam: string): Partial<PokemonSet>[] {
    const pokes = rawTeam.split(/\r\n\r\n|\n\n|\r\r/);
    return pokes.map((poke) => Sets.importSet(poke));
  }

  encodeTeam(team: Partial<PokemonSet>[]): string {
    const pokes = team.map((set) => Sets.exportSet(set));
    return pokes.join('\n\n');
  }
}
