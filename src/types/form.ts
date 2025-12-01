import { Tournament } from './api';

export type FormActionState<T> =
  | {
      success: false;
      data: T;
      errors?: {
        [key in keyof T]?: { errors: string[] };
      };
      error?: string[] | string;
    }
  | {
      success: true;
    };

export type TournamentDataSource = 'pokedata';

export type AddTournamentFormData = Pick<
  Tournament,
  'name' | 'season' | 'format'
> & {
  source: string;
  data: string;
};
