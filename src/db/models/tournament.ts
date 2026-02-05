import { Model, models, Schema } from 'mongoose';

import TeamService from '@/src/services/pokemon/team';
import {
  CreateTournamentData,
  Tournament,
  TournamentTeam,
} from '@/src/types/api';

import DBConnection from '../DBConnection';
import { BaseRepository } from '../repository';

export const TournamentModelName = 'Tournament';
const teamsService = new TeamService();

const TournamentTeamSchema = new Schema<TournamentTeam>(
  {
    player: { type: String },
    data: { type: String, required: true },
  },
  {
    id: true,
    virtuals: {
      team: {
        get: function (this: TournamentTeam) {
          return teamsService.parseTeam(this.data);
        },
      },
    },
  },
);

export const TournamentSchema = new Schema<Tournament>(
  {
    name: { type: String, requried: true },
    season: { type: Number, required: true },
    format: { type: String, required: true },
    teams: [{ type: TournamentTeamSchema, required: true }],
  },
  {
    id: true,
    timestamps: true,
  },
);

TournamentSchema.path('createdAt').get((val?: Date) => val?.toISOString?.());
TournamentSchema.path('updatedAt').get((val?: Date) => val?.toISOString?.());

export default class TournamentRepository
  implements BaseRepository<Tournament, CreateTournamentData>
{
  protected model: Model<Tournament>;

  constructor() {
    this.model =
      (models.Tournament as Model<Tournament>) ||
      DBConnection.getConnection().model(TournamentModelName, TournamentSchema);
  }

  async getById(id: string): Promise<Tournament> {
    const tournament = await this.model.findById(id);
    if (!tournament) {
      throw new TournamentNotFoundError(id);
    }
    return tournament.toObject();
  }

  async create(tournament: CreateTournamentData): Promise<Tournament> {
    return (await this.model.create(tournament)).toObject();
  }

  async deleteById(id: string) {
    await this.model.findByIdAndDelete(id);
  }

  async getAll(): Promise<Tournament[]> {
    const tournaments = await this.model.find();
    return tournaments.map((t) => t.toObject());
  }

  async findByName(name: string): Promise<Tournament | null> {
    const tournament = await this.model.findOne({ name });
    if (!tournament) return null;
    return tournament.toObject();
  }
}

export class TournamentNotFoundError extends Error {
  id: string;

  constructor(id: string) {
    super(`Could not find tournament with id ${id}`);
    this.id = id;
  }
}
