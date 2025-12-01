import { PokemonClient } from 'pokenode-ts';

import { type PokemonSet } from '@/src/services/pokemon';
import { CreateTournamentData, TournamentTeam } from '@/src/types/api';
import { TournamentDataSource } from '@/src/types/form';

import TeamService from './team';

type TournamentMetadata = Pick<
  CreateTournamentData,
  'name' | 'season' | 'format'
>;
type DataFormats = PokedataRawData;
export type ParserType = TournamentDataSource;

export interface TournamentParser<T = unknown> {
  parserType: ParserType;
  parse(
    tournamet: TournamentMetadata,
    rawData: T,
  ): Promise<CreateTournamentData>;
}

export interface PokedataDecklist {
  id?: string;
  name?: string;
  teratype?: string;
  ability?: string;
  item?: string;
  badges?: string[];
}

export interface PokedataRawData {
  name?: string;
  decklist?: PokedataDecklist[];
}

export class PokedataTournamentParser
  implements TournamentParser<PokedataRawData[]>
{
  parserType: ParserType = 'pokedata';
  protected teamService: TeamService;
  protected pokemonClient: PokemonClient;

  constructor() {
    this.teamService = new TeamService();
    this.pokemonClient = new PokemonClient();
  }

  async parse(metadata: TournamentMetadata, data: PokedataRawData[]) {
    const promises = await Promise.allSettled(
      data.map((team) => this.parseTeam(team)),
    );
    promises.forEach((result) => {
      if (result.status === 'fulfilled') return;
      const reason: unknown =
        result.reason instanceof Error ? result.reason.message : result.reason;
      console.warn('Failed to parse team due to:', reason);
    });
    const tournamet: CreateTournamentData = {
      ...metadata,
      teams: promises
        .filter((result) => result.status === 'fulfilled')
        .map(({ value }) => value),
    };
    return tournamet;
  }

  async parseTeam(data: PokedataRawData): Promise<TournamentTeam> {
    const player = data.name;
    if (!data.decklist) {
      throw new ParseTeamError(this.parserType, 'missing decklist', data);
    }
    const team = await this.parsePokemonSet(data.decklist);
    return {
      player: player ?? 'unknown',
      team,
      data: this.teamService.encodeTeam(team),
    };
  }

  async parsePokemonSet(
    data: PokedataDecklist[],
  ): Promise<Partial<PokemonSet>[]> {
    const set = await Promise.all(data.map((val) => this.parsePoke(val)));
    return set;
  }

  async parsePoke(data: PokedataDecklist): Promise<Partial<PokemonSet>> {
    const { id, ability, teratype: teraType, item, badges: moves } = data;
    if (!id) {
      throw new ParsePokemonError(this.parserType, 'missing pokemon id', data);
    }
    const pokemon = await this.pokemonClient.getPokemonById(Number(id));
    return {
      species: pokemon.name,
      ability,
      item,
      moves,
      teraType,
    };
  }
}

export default class TournamentParserFactory {
  static parsers: Record<ParserType, TournamentParser<DataFormats[]>> = {
    pokedata: new PokedataTournamentParser(),
  };
  static getParser(parserType: ParserType) {
    return TournamentParserFactory.parsers[parserType];
  }
}

export class ParseTeamError<T> extends Error {
  reason: string;
  parser: ParserType;
  data: T;

  constructor(parser: ParserType, reason: string, data: T) {
    super(`Failed to parse team using parser ${parser} due to: ${reason}`);
    this.reason = reason;
    this.parser = parser;
    this.data = data;
  }
}

export class ParsePokemonError<T> extends Error {
  reason: string;
  parser: ParserType;
  data: T;

  constructor(parser: ParserType, reason: string, data: T) {
    super(`Failed to parse pokemon using parser ${parser} due to: ${reason}`);
    this.parser = parser;
    this.data = data;
    this.reason = reason;
  }
}
