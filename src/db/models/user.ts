import { compare, hash } from 'bcrypt';
import { Model, models, Schema } from 'mongoose';

import { TupleUnion } from '@/src/types';
import {
  Battle,
  CreateBattleData,
  CreateTeamData,
  CreateTrainingData,
  SignInData,
  SignUpData,
  Team,
  Training,
  UnsensitiveUserData,
  User,
} from '@/src/types/api';

import DBConnection from '../DBConnection';
import { BaseRepository } from '../repository';
import TeamRepository, { TeamModelName, TeamNotFoundError } from './team';
import TrainingRepository, {
  BattleNotFoundError,
  TrainingModelName,
  TrainingNotFoundError,
} from './training';

const UserModelName = 'User';

const UserRoleEnumList: TupleUnion<User['role']> = ['user', 'admin'];

const UserSchema = new Schema<User>(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    teams: [{ type: Schema.Types.ObjectId, ref: TeamModelName }],
    trainings: [{ type: Schema.Types.ObjectId, ref: TrainingModelName }],
    role: { type: String, required: true, enum: UserRoleEnumList },
  },
  {
    id: true,
    timestamps: true,
  },
);

UserSchema.path('createdAt').get((val?: Date) => val?.toISOString?.());
UserSchema.path('updatedAt').get((val?: Date) => val?.toISOString?.());

export default class UserRepository implements BaseRepository<User> {
  static HASH_SALTS = 5;
  protected model: Model<User>;
  protected teamRepository: TeamRepository;
  protected trainingRepository: TrainingRepository;

  constructor() {
    this.model =
      (models.User as Model<User>) ||
      DBConnection.getConnection().model(UserModelName, UserSchema);
    this.teamRepository = new TeamRepository();
    this.trainingRepository = new TrainingRepository();
  }

  async getById(id: string) {
    const user = await this.model.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    await user.populate('teams');
    return user.toObject();
  }

  async create(user: SignUpData, role?: User['role']) {
    const sameUsernameCount = await this.model.countDocuments({
      username: new RegExp(user.username, 'i'),
    });
    if (sameUsernameCount) {
      throw new UserAlreadyExistsError(user);
    }
    user.password = await hash(user.password, UserRepository.HASH_SALTS);
    const defaultTraining: CreateTrainingData = {
      name: 'Quick battles',
      description: '',
    };
    const createdUser = await this.model.create({
      username: user.username,
      password: user.password,
      role: role ?? 'user',
      teams: [],
      trainings: [],
    });
    const training = await this.addNewTraining(
      createdUser.id as string,
      defaultTraining,
    );
    await this.updateTraining(createdUser.id as string, training.id, {
      isDefault: true,
    });
    return this.getById(createdUser.id as string);
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

    return { username, id: user.id as string, role: user.role };
  }

  async addNewTeam(id: string, team: CreateTeamData): Promise<Team> {
    const user = await this.model.findById(id);
    if (!user) throw new UserNotFoundError(id);
    const createdTeam = await this.teamRepository.create(team);
    await this.model.findByIdAndUpdate(id, {
      $push: { teams: createdTeam.id },
    });
    return createdTeam;
  }

  async deleteTeam(id: string, teamId: string) {
    const user = await this.model.findById(id);
    if (!user) return;
    await user.populate('teams');
    if (!user.teams.some((t) => t.id === teamId)) return;
    await this.model.findByIdAndUpdate(id, {
      $pull: { teams: teamId },
    });
    await this.teamRepository.deleteById(teamId);
  }

  async getTeamById(userId: string, teamId: string): Promise<Team> {
    const user = await this.model.findById(userId);
    if (!user) throw new UserNotFoundError(userId);
    await user.populate('teams');
    const team = user.teams.find((team) => team.id === teamId);
    if (!team) {
      throw new TeamNotFoundError(teamId);
    }
    return team;
  }

  async addNewTraining(
    userId: string,
    training: CreateTrainingData,
  ): Promise<Training> {
    const user = await this.model.findById(userId);
    if (!user) throw new UserNotFoundError(userId);
    const createdTraining = await this.trainingRepository.create(training);
    await this.model.findByIdAndUpdate(userId, {
      $push: { trainings: createdTraining.id },
    });
    return createdTraining;
  }

  async deleteTraining(userId: string, trainingId: string) {
    const user = await this.model.findById(userId);
    if (!user) return;
    await user.populate('trainings');
    if (!user.trainings.some((t) => t.id === trainingId)) return;
    await this.model.findByIdAndUpdate(userId, {
      $pull: { trainings: trainingId },
    });
    return await this.trainingRepository.deleteById(trainingId);
  }

  async getTrainings(userId: string): Promise<Training[]> {
    const user = await this.model.findById(userId);
    if (!user) throw new UserNotFoundError(userId);
    await user.populate({
      path: 'trainings',
      populate: [
        {
          path: 'battles',
          populate: 'team',
        },
        { path: 'team' },
      ],
    });
    return user.toObject().trainings;
  }

  async updateTraining(
    userId: string,
    trainingId: string,
    data: Partial<Training>,
  ) {
    const user = await this.model.findById(userId);
    if (!user) throw new UserNotFoundError(userId);
    await user.populate('trainings');
    if (!user.trainings.some((t) => t.id === trainingId)) {
      throw new TrainingNotFoundError(trainingId);
    }
    return await this.trainingRepository.updateById(trainingId, data);
  }

  async addNewBattle(
    userId: string,
    trainingId: string,
    battle: CreateBattleData,
  ): Promise<Battle> {
    const user = await this.model.findById(userId);
    if (!user) throw new UserNotFoundError(userId);
    await user.populate('trainings');
    if (!user.trainings.some((t) => t.id === trainingId)) {
      throw new TrainingNotFoundError(trainingId);
    }
    const createdBattle = await this.trainingRepository.addNewBattle(
      trainingId,
      battle,
    );
    return createdBattle;
  }

  async deleteBattle(userId: string, trainingId: string, battleId: string) {
    const user = await this.model.findById(userId);
    if (!user) return;
    await user.populate('trainings');
    if (!user.trainings.some((t) => t.id === trainingId)) return;
    return await this.trainingRepository.deleteBattle(trainingId, battleId);
  }

  async updateBattle(
    userId: string,
    trainingId: string,
    battleId: string,
    data: Partial<Battle>,
  ) {
    const user = await this.model.findById(userId);
    if (!user) throw new UserNotFoundError(userId);
    await user.populate('trainings');
    if (!user.trainings.some((t) => t.id === trainingId)) {
      throw new TrainingNotFoundError(trainingId);
    }
    return await this.trainingRepository.updateBattle(
      trainingId,
      battleId,
      data,
    );
  }

  async getTrainingById(userId: string, trainingId: string) {
    const training = (await this.getTrainings(userId)).find(
      ({ id }) => id === trainingId,
    );
    if (!training) {
      throw new TrainingNotFoundError(trainingId);
    }
    return training;
  }

  async getBattleById(userId: string, trainingId: string, battleId: string) {
    const training = await this.getTrainingById(userId, trainingId);
    const battle = training.battles.find(({ id }) => id === battleId);
    if (!battle) {
      throw new BattleNotFoundError(battleId);
    }
    return battle;
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
