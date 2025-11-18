export interface Team {
  id: string;
  data: string;
  season: number;
  regulation: string;
  tags: string[];
  name: string;
  description: string;
}

export type CreateTeamData = Omit<Team, 'id'>;

export interface User {
  id: string;
  username: string;
  password: string;
  teams: Team[];
}

export type SignUpData = Pick<User, 'username' | 'password'>;

export type SignInData = Pick<SignUpData, 'username' | 'password'>;

export type UnsensitiveUserData = Pick<User, 'username' | 'id'>;
