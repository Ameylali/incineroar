import { compare, hash } from 'bcrypt';
import { Model, models, Schema } from 'mongoose';

import {
  CreateTeamData,
  SignInData,
  SignUpData,
  Team,
  UnsensitiveUserData,
  User,
} from '@/src/types/api';

import DBConnection from '../DBConnection';
import { BaseRepository } from '../repository';
import TeamRepository, { TeamModelName } from './team';

const UserModelName = 'User';

const UserSchema = new Schema<User>(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    teams: [{ type: Schema.Types.ObjectId, ref: TeamModelName }],
  },
  {
    id: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

export default class UserRepository implements BaseRepository<User> {
  static HASH_SALTS = 5;
  protected model: Model<User>;
  protected teamRepository: TeamRepository;

  constructor() {
    this.model =
      (models.User as Model<User>) ||
      DBConnection.getConnection().model(UserModelName, UserSchema);
    this.teamRepository = new TeamRepository();
  }

  async getById(id: string) {
    const user = await this.model.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    await user.populate('teams');
    return user.toObject();
  }

  async create(user: SignUpData) {
    const sameUsernameCount = await this.model.countDocuments({
      username: new RegExp(user.username, 'i'),
    });
    if (sameUsernameCount) {
      throw new UserAlreadyExistsError(user);
    }
    user.password = await hash(user.password, UserRepository.HASH_SALTS);
    return (await this.model.create({ ...user, teams: [] })).toObject();
  }

  async exists({
    username,
    password,
  }: SignInData): Promise<UnsensitiveUserData | undefined> {
    const user = await this.model.findOne({
      username: new RegExp(username, 'i'),
    });
    if (!user) {
      return undefined;
    }
    const isSamePassword = await compare(password, user.password);
    if (!isSamePassword) {
      return undefined;
    }

    return { username, id: user.id as string };
  }

  async addNewTeam(id: string, team: CreateTeamData): Promise<Team> {
    const user = await this.model.findById(id);
    if (!user) throw new UserNotFoundError(id);
    const createdTeam = await this.teamRepository.create(team);
    user.teams.push(createdTeam);
    await user.save();
    return createdTeam;
  }

  async deleteTeam(id: string, teamId: string) {
    const user = await this.model.findById(id);
    if (!user) throw new UserNotFoundError(id);
    await this.model.updateOne(
      { id },
      {
        $pull: { arrayFiledName: { propertyName: teamId } },
      },
    );
    await this.teamRepository.deleteById(teamId);
  }
}

export class UserNotFoundError extends Error {
  id: string;
  constructor(id: string) {
    super(`User with id ${id} not found`);
    this.id = id;
  }
}

export class UserAlreadyExistsError extends Error {
  user: SignUpData;
  constructor(user: SignUpData) {
    super(`User with username: ${user.username} already exists`);
    this.user = user;
  }
}
