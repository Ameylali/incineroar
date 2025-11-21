import { Model, models, Schema } from 'mongoose';

import TeamService from '@/src/services/pokemon/team';
import { CreateTeamData, Team } from '@/src/types/api';

import DBConnection from '../DBConnection';
import { CRUDRepository } from '../repository';

export const TeamModelName = 'Team';

export const TeamSchema = new Schema<Team>(
  {
    data: { type: String, required: true },
    season: { type: Number, required: true },
    regulation: { type: String, required: true },
    tags: [{ type: String, required: true }],
    name: { type: String, required: true },
    description: { type: String, required: true },
  },
  {
    id: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    virtuals: {
      parsedTeam: {
        get: function () {
          const teamsService = new TeamService();
          return teamsService.parseTeam(this.data as string);
        },
      },
    },
  },
);

export default class TeamRepository implements CRUDRepository<Team> {
  protected model: Model<Team>;

  constructor() {
    this.model =
      (models.Team as Model<Team>) ||
      DBConnection.getConnection().model(TeamModelName, TeamSchema);
  }

  async getById(id: string): Promise<Team> {
    const team = await this.model.findById(id);
    if (!team) {
      throw new TeamNotFoundError(id);
    }
    return team.toObject();
  }

  async create(team: CreateTeamData): Promise<Team> {
    return (await this.model.create(team)).toObject();
  }

  async updateById(
    id: string,
    updateData: Partial<CreateTeamData>,
  ): Promise<Team> {
    const team = await this.model.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!team) {
      throw new TeamNotFoundError(id);
    }
    return team.toObject();
  }

  async deleteById(id: string) {
    await this.model.findByIdAndDelete(id);
  }
}

export class TeamNotFoundError extends Error {
  id: string;
  constructor(id: string) {
    super(`Team with id ${id} not found`);
    this.id = id;
  }
}
