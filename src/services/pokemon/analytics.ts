import 'core-js/es/iterator';

import { createHash } from 'crypto';

import { type PokemonSet } from '@/src/services/pokemon';
import {
  Action,
  AnalyticsResponse,
  Battle,
  BattleMovesAnalytics,
  BattlePokemonAnalytics,
  BattleResultAnalytics,
  EvUsage,
  KeyActionsAnalytics,
  MatchupAnalytics,
  PokemonAnalytics,
  PokemonKeyActionAnalytics,
  PokemonKoOrFaintAnalytics,
  TeamAnalytics,
  TournamentTeam,
  Training,
  TrainingAnalytics,
  TurnMap,
  Usage,
} from '@/src/types/api';

import { TrainingAnalyticsConfig } from './analytics.config';
import { ActionKeyWords } from './battle';

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
  teams: TournamentTeam[];
}

export default class AnalyticsService {
  async getAnalytics(teams: TournamentTeam[]): Promise<AnalyticsResponse> {
    const pokemon = new Map<string, PokemonAnalysis>();
    const cores = new Map<number, CoreAnalysis>();
    const context: AnalysisContext = { pokemon, cores, teams };
    for (const { team } of teams) {
      await this.analyzeCores(team, [], 0, context);
    }
    return this.contextToResponse(context);
  }

  protected contextToResponse({
    pokemon,
    cores,
    teams,
  }: AnalysisContext): AnalyticsResponse {
    const response: AnalyticsResponse = {
      pokemon: [],
      cores: {},
      totalTeamsCount: teams.length,
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

type BattleResult = Exclude<Battle['result'], undefined> | 'unknown';

class MatchupTracker {
  pokemon: string[];
  results: Map<BattleResult, number>;
  count: number;
  pairingsTracker: Map<string, MatchupTracker>;

  constructor(pokemon: string[]) {
    this.pokemon = pokemon;
    this.results = new Map();
    this.count = 0;
    this.pairingsTracker = new Map();
  }

  static getHash(pokemon: string[]) {
    const hash = createHash('sha256');
    hash.update(pokemon.sort().join('|'));
    return hash.digest('hex');
  }

  track(result: BattleResult, pairing?: string[]) {
    this.count += 1;
    if (!this.results.has(result)) {
      this.results.set(result, 0);
    }
    const currCount = this.results.get(result)!;
    this.results.set(result, currCount + 1);

    if (!pairing || pairing.length === 0) return;

    const pairingHash = MatchupTracker.getHash(pairing);
    if (!this.pairingsTracker.has(pairingHash)) {
      this.pairingsTracker.set(pairingHash, new MatchupTracker(pairing));
    }
    this.pairingsTracker.get(pairingHash)!.track(result);
  }

  getAnalysisResult(): MatchupAnalytics {
    const results: BattleResultAnalytics[] = [];
    this.results.forEach((count, result) => {
      results.push({ result, count });
    });

    const pairings: {
      pokemon: string[];
      results: BattleResultAnalytics[];
      encounterCount: number;
    }[] = [];
    this.pairingsTracker.forEach((tracker) => {
      pairings.push({
        pokemon: tracker.pokemon,
        results: tracker.getAnalysisResult().results,
        encounterCount: tracker.count,
      });
    });

    return {
      pokemon: this.pokemon,
      results,
      pairings,
      usageCount: this.count,
    };
  }
}

class PokemonTracker {
  pokemon: string;
  koCount: number;
  kos: Map<string, number>;
  faintCount: number;
  faints: Map<string, number>;
  usageCount: number;
  moves: Map<string, number>;
  movesBattleAverage: Map<string, Map<number, number>>;

  constructor(pokemon: string) {
    this.pokemon = pokemon;
    this.koCount = 0;
    this.kos = new Map();
    this.faintCount = 0;
    this.faints = new Map();
    this.usageCount = 0;
    this.moves = new Map();
    this.movesBattleAverage = new Map();
  }

  track() {
    this.usageCount += 1;
  }

  trackKo(koedPokemon: string) {
    this.koCount += 1;
    if (!this.kos.has(koedPokemon)) {
      this.kos.set(koedPokemon, 0);
    }
    const currCount = this.kos.get(koedPokemon)!;
    this.kos.set(koedPokemon, currCount + 1);
  }

  trackFaint(faintedByPokemon: string) {
    this.faintCount += 1;
    if (!this.faints.has(faintedByPokemon)) {
      this.faints.set(faintedByPokemon, 0);
    }
    const currCount = this.faints.get(faintedByPokemon)!;
    this.faints.set(faintedByPokemon, currCount + 1);
  }

  trackMoveUsage(move: string, battleId: number) {
    if (!this.moves.has(move)) {
      this.moves.set(move, 0);
      this.movesBattleAverage.set(move, new Map());
    }

    const battleMap = this.movesBattleAverage.get(move)!;
    if (!battleMap.has(battleId)) {
      battleMap.set(battleId, 0);
      const currCount = this.moves.get(move)!;
      this.moves.set(move, currCount + 1);
    }
    const currBattleCount = battleMap.get(battleId)!;
    battleMap.set(battleId, currBattleCount + 1);
  }

  getAnalysisResult(): BattlePokemonAnalytics {
    const kos: PokemonKoOrFaintAnalytics['matchups'] = [];
    this.kos.forEach((count, pokemon) => {
      kos.push({ pokemon, count });
    });

    const faints: PokemonKoOrFaintAnalytics['matchups'] = [];
    this.faints.forEach((count, pokemon) => {
      faints.push({ pokemon, count });
    });

    const moves: BattleMovesAnalytics[] = [];
    this.moves.forEach((count, move) => {
      const battleMap = this.movesBattleAverage.get(move)!;
      let totalBattles = 0;
      let totalUsage = 0;
      battleMap.forEach((usage) => {
        totalBattles += 1;
        totalUsage += usage;
      });
      const averageUsageByMatch = totalUsage / totalBattles;
      moves.push({
        move,
        averageUsage: count / this.usageCount,
        averageUsageByMatch,
      });
    });

    return {
      pokemon: this.pokemon,
      performance: {
        ko: {
          matchups: kos,
          count: this.koCount,
        },
        faint: {
          matchups: faints,
          count: this.faintCount,
        },
        damage: {},
      },
      usageCount: this.usageCount,
      moves,
    };
  }
}

class PokemonKeyActionsTracker {
  actionName: string;
  pokemonUsage: Map<string, number>;
  actionUsage: Map<string, number>;

  constructor(actionName: string) {
    this.actionName = actionName;
    this.pokemonUsage = new Map();
    this.actionUsage = new Map();
  }

  track(pokemon: string, action: string) {
    if (!this.pokemonUsage.has(pokemon)) {
      this.pokemonUsage.set(pokemon, 0);
    }
    const currCount = this.pokemonUsage.get(pokemon)!;
    this.pokemonUsage.set(pokemon, currCount + 1);

    if (!this.actionUsage.has(action)) {
      this.actionUsage.set(action, 0);
    }
    const currActionCount = this.actionUsage.get(action)!;
    this.actionUsage.set(action, currActionCount + 1);
  }

  getAnalysisResult(): PokemonKeyActionAnalytics {
    const pokemonUsage: PokemonKeyActionAnalytics['pokemonUsage'] = [];
    this.pokemonUsage.forEach((count, pokemon) => {
      pokemonUsage.push({ pokemon, count });
    });

    const actionUsage: PokemonKeyActionAnalytics['actionUsage'] = [];
    this.actionUsage.forEach((count, action) => {
      actionUsage.push({ action, count });
    });

    return {
      name: this.actionName,
      pokemonUsage,
      actionUsage,
    };
  }
}

type KeyAction = 'speed control' | 'weather control' | 'field control' | 'tera';

class KeyActionsTracker {
  kos: Map<number, number>;
  faints: Map<number, number>;
  switches: Map<number, number>;
  myActions: Map<KeyAction, PokemonKeyActionsTracker>;
  rivalActions: Map<KeyAction, PokemonKeyActionsTracker>;

  constructor() {
    this.kos = new Map();
    this.faints = new Map();
    this.switches = new Map();
    this.myActions = new Map();
    this.rivalActions = new Map();
  }

  trackKo(turn: number) {
    if (!this.kos.has(turn)) {
      this.kos.set(turn, 0);
    }
    const currCount = this.kos.get(turn)!;
    this.kos.set(turn, currCount + 1);
  }

  trackFaint(turn: number) {
    if (!this.faints.has(turn)) {
      this.faints.set(turn, 0);
    }
    const currCount = this.faints.get(turn)!;
    this.faints.set(turn, currCount + 1);
  }

  trackSwitch(turn: number) {
    if (!this.switches.has(turn)) {
      this.switches.set(turn, 0);
    }
    const currCount = this.switches.get(turn)!;
    this.switches.set(turn, currCount + 1);
  }

  trackPokemonAction(
    actionName: KeyAction,
    pokemon: string,
    move: string,
    isRival?: boolean,
  ) {
    const actionsMap = isRival ? this.rivalActions : this.myActions;
    if (!actionsMap.has(actionName)) {
      actionsMap.set(actionName, new PokemonKeyActionsTracker(actionName));
    }
    actionsMap.get(actionName)!.track(pokemon, move);
  }

  getAnalysisResult(): KeyActionsAnalytics {
    const kos: TurnMap[] = [];
    this.kos.forEach((count, turn) => {
      kos.push({ turn, count });
    });

    const faints: TurnMap[] = [];
    this.faints.forEach((count, turn) => {
      faints.push({ turn, count });
    });

    const switches: TurnMap[] = [];
    this.switches.forEach((count, turn) => {
      switches.push({ turn, count });
    });

    return {
      kos,
      faints,
      switches,
      pokemonKeyActions: {
        byMe: Array.from(this.myActions.values()).map((tracker) =>
          tracker.getAnalysisResult(),
        ),
        byRival: Array.from(this.rivalActions.values()).map((tracker) =>
          tracker.getAnalysisResult(),
        ),
      },
    };
  }
}

interface TrainingAnalyticsContext {
  matchups: Map<string, MatchupTracker>;
  openings: Map<string, MatchupTracker>;
  pokemon: Map<string, PokemonTracker>;
  keyActions: KeyActionsTracker;
}

type EventTracker = (
  battle: number,
  turn: number,
  action: Action,
  ctx: TrainingAnalyticsContext,
) => void;

export class TrainingAnalyticsService {
  private eventTrackers: EventTracker[] = [
    // track faints
    (_battle, turn, action, ctx) => {
      if (action.name.includes(ActionKeyWords.FAINTED)) {
        ctx.keyActions.trackFaint(turn);

        const { pokemon, player } = this.parsePokemon(
          action.user,
          action.player,
        );
        if (player !== 'p1') return;
        const tracker = ctx.pokemon.get(pokemon);
        if (!tracker) {
          console.warn(
            `No tracker found for pokemon ${pokemon} when tracking faint.`,
          );
          return;
        }
        tracker.trackFaint(ActionKeyWords.UNKNOWN);
      }
    },
    // track move usage
    (battle, _turn, action, ctx) => {
      if (action.type === 'move') {
        const { pokemon, player } = this.parsePokemon(
          action.user,
          action.player,
        );
        if (player !== 'p1') return;
        const tracker = ctx.pokemon.get(pokemon);
        if (!tracker) {
          console.warn(
            `No tracker found for pokemon ${pokemon} when tracking move usage.`,
          );
          return;
        }
        tracker.trackMoveUsage(action.name, battle);
      }
    },
    // track switches
    (_battle, turn, action, ctx) => {
      if (action.type === 'switch') {
        if (action.player !== 'p1') return;
        ctx.keyActions.trackSwitch(turn);
      }
    },
    // track speed control actions
    (_battle, _turn, { type, user, player: actionPlayer, name }, ctx) => {
      for (const speedControlAction of TrainingAnalyticsConfig.speedControlMoves) {
        if (
          type === 'move' &&
          name.toLowerCase().includes(speedControlAction.toLowerCase())
        ) {
          const { pokemon, player } = this.parsePokemon(user, actionPlayer);
          const isRival = player !== 'p1';
          ctx.keyActions.trackPokemonAction(
            'speed control',
            pokemon,
            name,
            isRival,
          );
        }
      }
    },
    // track weather changes
    (_battle, _turn, action, ctx) => {
      if (
        action.name.includes(ActionKeyWords.WEATHER) &&
        !action.name.includes(ActionKeyWords.ENDED) &&
        action.user !== ''
      ) {
        const { pokemon, player } = this.parsePokemon(
          action.user,
          action.player,
        );
        const isRival = player !== 'p1';
        const name = action.name.split(ActionKeyWords.WEATHER)?.at(-1)?.trim();
        ctx.keyActions.trackPokemonAction(
          'weather control',
          pokemon,
          name ?? ActionKeyWords.UNKNOWN,
          isRival,
        );
      }
    },
    // track fields and volatile effects
    (_battle, _turn, action, ctx) => {
      if (
        action.type === 'effect' &&
        action.name.includes(ActionKeyWords.STARTED) &&
        action.user !== ''
      ) {
        const { pokemon, player } = this.parsePokemon(
          action.user,
          action.player,
        );
        const isRival = player !== 'p1';
        let name: string | undefined = action.name.split(
          ActionKeyWords.STARTED,
        )?.[0];
        if (name?.includes('caused')) {
          name = name.split('caused')?.[1];
        }
        name = name?.trim();
        ctx.keyActions.trackPokemonAction(
          'field control',
          pokemon,
          name ?? ActionKeyWords.UNKNOWN,
          isRival,
        );
      }
    },
    // track tera type changes
    (_battle, _turn, action, ctx) => {
      if (
        action.type === 'effect' &&
        action.name.includes(ActionKeyWords.TERA) &&
        action.user !== ''
      ) {
        const { pokemon, player } = this.parsePokemon(
          action.user,
          action.player,
        );
        const isRival = player !== 'p1';
        let name = action.name.split(ActionKeyWords.TERA)?.at(-1);
        name = name?.replace('to', '');
        name = name?.trim();
        ctx.keyActions.trackPokemonAction(
          'tera',
          pokemon,
          name ?? ActionKeyWords.UNKNOWN,
          isRival,
        );
      }
    },
  ];

  getAnalytics(training: Training): TrainingAnalytics {
    const matchups = new Map<string, MatchupTracker>();
    const openings = new Map<string, MatchupTracker>();
    const pokemon = new Map<string, PokemonTracker>();
    const keyActions = new KeyActionsTracker();
    const context: TrainingAnalyticsContext = {
      matchups,
      openings,
      pokemon,
      keyActions,
    };

    training.battles.forEach((battle, battleIndex) => {
      const result = battle.result ?? 'unknown';
      const { core, rivalCore } = this.getCores(battle);
      const { core: openingCore, rivalCore: openingRivalCore } = this.getCores(
        battle,
        true,
      );

      const coreHash = MatchupTracker.getHash(core);
      if (!matchups.has(coreHash)) {
        matchups.set(coreHash, new MatchupTracker(core));
      }
      matchups.get(coreHash)!.track(result, rivalCore);

      const openingCoreHash = MatchupTracker.getHash(openingCore);
      if (!openings.has(openingCoreHash)) {
        openings.set(openingCoreHash, new MatchupTracker(openingCore));
      }
      openings.get(openingCoreHash)!.track(result, openingRivalCore);

      core.forEach((species) => {
        if (!pokemon.has(species)) {
          pokemon.set(species, new PokemonTracker(species));
        }
        const tracker = pokemon.get(species)!;
        tracker.track();
      });

      battle.turns.forEach((turn, index) => {
        turn.actions.forEach((action) => {
          this.eventTrackers.forEach((tracker) => {
            tracker(battleIndex, index + 1, action, context);
          });
        });
      });
    });

    return {
      matchups: {
        all: Array.from(matchups.values()).map((tracker) =>
          tracker.getAnalysisResult(),
        ),
        openings: Array.from(openings.values()).map((tracker) =>
          tracker.getAnalysisResult(),
        ),
      },
      pokemon: Array.from(pokemon.values()).map((tracker) =>
        tracker.getAnalysisResult(),
      ),
      keyActions: keyActions.getAnalysisResult(),
    };
  }

  private parsePokemon(rawPokemon: string, actionPlayer?: string) {
    const [playerOrPokemon, pokemonName] = rawPokemon.split(':');
    const player =
      (playerOrPokemon.startsWith('p1')
        ? 'p1'
        : playerOrPokemon.startsWith('p2')
          ? 'p2'
          : undefined) ?? actionPlayer;
    let pokemon = pokemonName;
    if (pokemon === undefined) {
      pokemon = playerOrPokemon;
    }
    return { player, pokemon };
  }

  private getCores(battle: Battle, onlyOpening?: boolean) {
    const core = new Set<string>();
    const rivalCore = new Set<string>();

    battle.turns.forEach((turn, index) => {
      if (onlyOpening && index > 0) {
        return;
      }

      turn.actions.forEach(({ user, player, targets, type }) => {
        if (onlyOpening && (type !== 'switch' || user !== '')) {
          return;
        }
        const pokemonList = [...targets, user];
        pokemonList.forEach((rawPokemon) => {
          if (rawPokemon !== '') {
            const { player: side, pokemon } = this.parsePokemon(
              rawPokemon,
              player,
            );
            if (side === 'p1') {
              core.add(pokemon);
            }
            if (side === 'p2') {
              rivalCore.add(pokemon);
            }
          }
        });
      });
    });
    return {
      core: Array.from(core),
      rivalCore: Array.from(rivalCore),
    };
  }
}
