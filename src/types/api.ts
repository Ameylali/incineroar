import { type PokemonSet } from '@/src/services/pokemon';

export interface Team {
  id: string;
  data: string;
  season: number;
  format: string;
  tags: string[];
  name: string;
  description: string;
  parsedTeam: Partial<PokemonSet>[];
  createdAt: string;
}

export type CreateTeamData = Omit<Team, 'id' | 'parsedTeam' | 'createdAt'>;
export type UpdateTeamData = Omit<Team, 'parsedTeam' | 'createdAt'>;

export interface User {
  id: string;
  username: string;
  password: string;
  teams: Team[];
  trainings: Training[];
  createdAt: string;
}

export type SignUpData = Pick<User, 'username' | 'password'>;

export type SignInData = Pick<SignUpData, 'username' | 'password'>;

export type UnsensitiveUserData = Pick<User, 'username' | 'id'>;

export type ExposedUser = Omit<User, 'password' | 'trainings'>;

export interface ErrorResponse {
  message: string;
}

export interface TournamentTeam {
  player: string;
  data: string;
  team: Partial<PokemonSet>[];
}

export interface Tournament {
  id: string;
  name: string;
  season: number;
  format: string;
  teams: TournamentTeam[];
  createdAt: string;
}

export type CreateTournamentData = Omit<
  Tournament,
  'teams' | 'createdAt' | 'id'
> & {
  teams: Omit<TournamentTeam, 'team'>[];
};

export interface Usage<T = string> {
  value: T;
  percentage: number;
}

export interface EvUsage {
  stat: keyof PokemonSet['evs'];
  values: Usage<number>[];
  average: number;
}

export interface PokemonAnalytics {
  species: string;
  usage: number;
  abilities: Usage[];
  items: Usage[];
  moves: Usage[];
  teraTypes: Usage[];
  evs: EvUsage[];
}

export interface TeamAnalytics {
  usage: number;
  pokemon: string[];
}

export interface AnalyticsResponse {
  totalTeamsCount: number;
  pokemon: PokemonAnalytics[];
  cores: Record<number, TeamAnalytics[]>;
}

type ActionType = 'move' | 'switch' | 'effect' | 'ability';
type BattleResult = 'win' | 'loose' | 'tie';
type Player = 'p1' | 'p2' | 'p3' | 'p4';
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type ActionActor = `${Player}:${string}` | string;

export interface Action {
  index: number;
  player?: Player;
  type: ActionType;
  name: string;
  user: ActionActor;
  targets: ActionActor[];
}

export interface Turn {
  index: number;
  actions: Action[];
}

export interface Battle {
  id: string;
  name: string;
  result?: BattleResult;
  team?: Team;
  season?: number;
  format?: string;
  notes: string;
  turns: Turn[];
  createdAt: string;
}

export type CreateActionData = Omit<Action, 'id'>;

export type CreateTurnData = Omit<Turn, 'id' | 'actions'> & {
  actions: CreateActionData[];
};

export type CreateBattleData = Omit<Battle, 'id' | 'createdAt' | 'turns'> & {
  turns: CreateTurnData[];
};

export interface Training extends Pick<Battle, 'team' | 'season' | 'format'> {
  id: string;
  isDefault: boolean;
  name: string;
  description: string;
  battles: Battle[];
  createdAt: string;
}

export type CreateTrainingData = Omit<
  Training,
  'id' | 'isDefault' | 'battles' | 'createdAt'
>;

export interface BattleResultAnalytics {
  result: string;
  count: number;
}

export interface MatchupAnalytics {
  pokemon: string[];
  results: BattleResultAnalytics[];
  pairings: {
    pokemon: string[];
    results: BattleResultAnalytics[];
    encounterCount: number;
  }[];
  usageCount: number;
}

export interface PokemonKoOrFaintAnalytics {
  matchups: {
    pokemon: string;
    count: number;
  }[];
  count: number;
}

export interface PerformanceAnalytics {
  ko: PokemonKoOrFaintAnalytics;
  faint: PokemonKoOrFaintAnalytics;
  // TODO: Implement damage analytics
  damage: unknown;
}

export interface BattleMovesAnalytics {
  move: string;
  averageUsage: number;
  averageUsageByMatch: number;
}

export interface BattlePokemonAnalytics {
  pokemon: string;
  performance: PerformanceAnalytics;
  usageCount: number;
  moves: BattleMovesAnalytics[];
}

export interface TurnMap {
  turn: number;
  count: number;
}

export interface PokemonKeyActionAnalytics {
  name: string;
  pokemonUsage: {
    pokemon: string;
    count: number;
  }[];
  actionUsage: {
    action: string;
    count: number;
  }[];
}

export interface KeyActionsAnalytics {
  kos: TurnMap[];
  faints: TurnMap[];
  switches: TurnMap[];
  pokemonKeyActions: {
    byMe: PokemonKeyActionAnalytics[];
    byRival: PokemonKeyActionAnalytics[];
  };
}

export interface TrainingAnalytics {
  matchups: {
    all: MatchupAnalytics[];
    openings: MatchupAnalytics[];
  };
  pokemon: BattlePokemonAnalytics[];
  keyActions: KeyActionsAnalytics;
}
