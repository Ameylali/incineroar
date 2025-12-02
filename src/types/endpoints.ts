import { ExposedUser, Team, Tournament } from './api';

// export interface GET_TOURNAMENT {}

export interface DELETE_TOURNAMENT {
  success: true;
}

export interface GET_TOURNAMENTS {
  tournaments: Tournament[];
}

export interface GET_ME {
  user: ExposedUser;
}

export interface GET_TEAM {
  team: Team;
}

export interface DELETE_TEAM {
  success: true;
}
