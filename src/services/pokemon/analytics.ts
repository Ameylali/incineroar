import 'core-js/es/iterator';

import { createHash } from 'crypto';

import { type PokemonSet } from '@/src/services/pokemon';
import {
  AnalyticsResponse,
  EvUsage,
  PokemonAnalytics,
  TeamAnalytics,
  TournamentTeam,
  Usage,
} from '@/src/types/api';

type StringSetProperty = 'ability' | 'item' | 'moves' | 'teraType';
type Stat = keyof PokemonSet['evs'];

export class UsageAnalysis<T> {
  protected valuesCount: Map<T, number>;
  protected totalCount: number;

  constructor() {
    this.valuesCount = new Map<T, number>();
    this.totalCount = 0;
  }

  addUsage(value: T) {
    this.totalCount += 1;
    if (!this.valuesCount.has(value)) {
      this.valuesCount.set(value, 0);
    }
    const currCount = this.valuesCount.get(value)!;
    this.valuesCount.set(value, currCount + 1);
  }

  getAnalysisResult(overrideTotalCount?: number): Usage<T>[] {
    const totalCount = overrideTotalCount ?? this.totalCount;
    if (this.totalCount === 0) return [];
    return this.valuesCount
      .entries()
      .map(([value, count]) => ({
        value,
        percentage: count / totalCount,
      }))
      .toArray();
  }

  getValues(): T[] {
    return this.valuesCount.keys().toArray();
  }
}

export class PokemonAnalysis {
  protected species: string;
  protected count: number;
  protected abilityUsage: UsageAnalysis<string>;
  protected itemUsage: UsageAnalysis<string>;
  protected movesUsage: UsageAnalysis<string>;
  protected teraTypeUsage: UsageAnalysis<string>;
  protected stringUsages: Record<StringSetProperty, UsageAnalysis<string>>;
  protected evsUsages: Record<Stat, UsageAnalysis<number>>;

  constructor(species: string) {
    this.species = species;
    this.count = 0;
    this.abilityUsage = new UsageAnalysis<string>();
    this.itemUsage = new UsageAnalysis<string>();
    this.movesUsage = new UsageAnalysis<string>();
    this.teraTypeUsage = new UsageAnalysis<string>();
    this.stringUsages = {
      ability: this.abilityUsage,
      item: this.itemUsage,
      moves: this.movesUsage,
      teraType: this.teraTypeUsage,
    };
    this.evsUsages = {
      atk: new UsageAnalysis<number>(),
      def: new UsageAnalysis<number>(),
      hp: new UsageAnalysis<number>(),
      spa: new UsageAnalysis<number>(),
      spd: new UsageAnalysis<number>(),
      spe: new UsageAnalysis<number>(),
    };
  }

  addUsage(set: Partial<PokemonSet>) {
    this.count++;
    const { moves, evs } = set;
    const keys = ['ability', 'item', 'teraType'] as const;
    for (const key of keys) {
      if (!set[key]) continue;
      this.addPropertyUsage(key, set[key]);
    }
    if (moves) {
      for (const move of moves) {
        this.addPropertyUsage('moves', move);
      }
    }
    if (evs) {
      for (const _stat of Object.keys(evs)) {
        const stat = _stat as keyof PokemonSet['evs'];
        if (!evs[stat]) continue;
        this.addEvUsage(stat, evs[stat]);
      }
    }
  }

  protected addPropertyUsage(key: StringSetProperty, value: string) {
    this.stringUsages[key].addUsage(value);
  }

  protected addEvUsage(stat: Stat, value: number) {
    this.evsUsages[stat].addUsage(value);
  }

  protected getEvsAnalysisResult(): EvUsage[] {
    return Object.keys(this.evsUsages).map((_stat) => {
      const stat = _stat as keyof typeof this.evsUsages;
      const values = this.evsUsages[stat].getAnalysisResult();
      const average = values
        .map(({ value, percentage }) => value * percentage)
        .reduce((v, acc) => acc + v, 0);
      return {
        stat,
        values: this.evsUsages[stat].getAnalysisResult(),
        average,
      };
    });
  }

  getAnalysisResult(): PokemonAnalytics {
    return {
      species: this.species,
      abilities: this.abilityUsage.getAnalysisResult(),
      items: this.itemUsage.getAnalysisResult(),
      moves: this.movesUsage.getAnalysisResult(this.count),
      teraTypes: this.teraTypeUsage.getAnalysisResult(),
      evs: this.getEvsAnalysisResult(),
      usage: this.count,
    };
  }
}

export class CoreAnalysis {
  size: number;
  coresCount: Map<string, number>;
  totalCount: number;
  cores: string[][];

  constructor(size: number) {
    this.size = size;
    this.coresCount = new Map<string, number>();
    this.totalCount = 0;
    this.cores = [];
  }

  addCoreUsage(core: (Partial<PokemonSet> & { species: string })[]) {
    const pokemon = core.map(({ species }) => species);
    const hash = this.getHash(pokemon);
    if (!this.coresCount.has(hash)) {
      this.totalCount++;
      this.coresCount.set(hash, 0);
      this.cores.push(pokemon);
    }
    const currCount = this.coresCount.get(hash)!;
    this.coresCount.set(hash, currCount + 1);
  }

  protected getHash(pokemon: string[]) {
    const hash = createHash('sha256');
    hash.update(pokemon.sort().join('|'));
    return hash.digest('hex');
  }

  getAnalysisResult(): TeamAnalytics[] {
    return this.cores.map((core) => {
      const hash = this.getHash(core);
      return {
        usage: this.coresCount.get(hash) ?? 0,
        pokemon: core,
      };
    });
  }
}

interface AnalysisContext {
  pokemon: Map<string, PokemonAnalysis>;
  cores: Map<number, CoreAnalysis>;
}

export default class AnalyticsService {
  async getAnalytics(teams: TournamentTeam[]): Promise<AnalyticsResponse> {
    const pokemon = new Map<string, PokemonAnalysis>();
    const cores = new Map<number, CoreAnalysis>();
    const context: AnalysisContext = { pokemon, cores };
    for (const { team } of teams) {
      await this.analyzeCores(team, [], 0, context);
    }
    return this.contextToResponse(context);
  }

  protected contextToResponse({
    pokemon,
    cores,
  }: AnalysisContext): AnalyticsResponse {
    const response: AnalyticsResponse = {
      pokemon: [],
      cores: {},
    };
    pokemon.forEach((analysis) => {
      response.pokemon.push(analysis.getAnalysisResult());
    });
    cores.entries().forEach(([size, analysis]) => {
      response.cores[size] = analysis.getAnalysisResult();
    });
    return response;
  }

  protected getPokemonAnalysis(
    species: string,
    { pokemon }: AnalysisContext,
  ): PokemonAnalysis {
    if (!pokemon.has(species)) {
      pokemon.set(species, new PokemonAnalysis(species));
    }
    return pokemon.get(species)!;
  }

  protected getCoreAnalysis(
    coreSize: number,
    { cores }: AnalysisContext,
  ): CoreAnalysis {
    if (!cores.has(coreSize)) {
      cores.set(coreSize, new CoreAnalysis(coreSize));
    }
    return cores.get(coreSize)!;
  }

  protected analyzeCore(core: Partial<PokemonSet>[], ctx: AnalysisContext) {
    const size = core.length;
    if (size === 0) return;
    if (size === 1) {
      const set = core[0];
      if (!set.species) return;
      this.getPokemonAnalysis(set.species, ctx).addUsage(set);
      return;
    }
    const allHaveSpecies = core.every((set) => {
      if (set === undefined) console.log(core, set);
      return set.species !== undefined;
    });
    if (!allHaveSpecies) return;
    const coreAnalysis = this.getCoreAnalysis(size, ctx);
    coreAnalysis.addCoreUsage(
      core as (Partial<PokemonSet> & { species: string })[],
    );
  }

  protected async analyzeCores(
    team: Partial<PokemonSet>[],
    core: Partial<PokemonSet>[],
    index: number,
    ctx: AnalysisContext,
  ): Promise<void> {
    if (index === team.length) {
      this.analyzeCore(core, ctx);
      return Promise.resolve();
    }
    // include pokemon at index in the core
    await this.analyzeCores(team, [...core, team[index]], index + 1, ctx);
    // exclude pokemon at index in the core
    await this.analyzeCores(team, core, index + 1, ctx);

    return Promise.resolve();
  }
}
