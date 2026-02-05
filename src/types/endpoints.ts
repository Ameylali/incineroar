import {
  AnalyticsResponse,
  Battle,
  ExposedUser,
  Team,
  Tournament,
  Training,
  TrainingAnalytics,
} from './api';

export interface GET_TOURNAMENT {
  tournament: Tournament;
  analysis?: AnalyticsResponse;
}

export interface GET_IMPORT_TOURNAMENT {
  message: string;
}

export interface DELETE_TOURNAMENT {
  success: true;
}

export interface GET_TOURNAMENTS {
  tournaments: Tournament[];
}

export interface POST_TOURNAMENT {
  tournament: Tournament;
}

export interface GET_ME {
  user: ExposedUser;
}

export interface GET_TEAM {
  team: Team;
}

export interface POST_TEAM {
  team: Team;
}

export interface DELETE_TEAM {
  success: true;
}

export interface GET_TRAININGS {
  trainings: Training[];
}

export interface POST_TRAINING {
  training: Training;
}

export interface GET_TRAINING {
  training: Training;
}

export interface DELETE_TRAINING {
  success: true;
}

export interface GET_BATTLE {
  battle: Battle;
}

export interface POST_BATTLE {
  battle: Battle;
}

export interface DELETE_BATTLE {
  success: true;
}

export interface GET_TRAINING_ANALYSIS {
  analysis: TrainingAnalytics;
}

export interface POST_AUTH {
  jwt: string;
}

export interface REQ_POST_AUTH {
  username?: string;
  password?: string;
}
