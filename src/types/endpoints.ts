import {
  AnalyticsResponse,
  ExposedUser,
  Team,
  Tournament,
  Training,
} from './api';

export interface GET_TOURNAMENT {
  tournament: Tournament;
  analysis?: AnalyticsResponse;
}

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

export interface GET_TRAININGS {
  trainings: Training[];
}

export interface DELETE_TRAINING {
  success: true;
}
