import { type PokemonSet } from '@/src/services/pokemon';

export interface Team {
  id: string;
  data: string;
  season: number;
  regulation: string;
  tags: string[];
  name: string;
  description: string;
  parsedTeam: Partial<PokemonSet>[];
}

export type CreateTeamData = Omit<Team, 'id' | 'parsedTeam'>;

export interface User {
  id: string;
  username: string;
  password: string;
  teams: Team[];
}

export type SignUpData = Pick<User, 'username' | 'password'>;

export type SignInData = Pick<SignUpData, 'username' | 'password'>;

export type UnsensitiveUserData = Pick<User, 'username' | 'id'>;

export type ExposedUser = Omit<User, 'password'>;

export interface ErrorResponse {
  message: string;
}
