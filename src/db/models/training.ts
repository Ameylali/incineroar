import { Model, models, Schema } from 'mongoose';

import { TupleUnion } from '@/src/types';
import {
  Action,
  Battle,
  CreateBattleData,
  CreateTrainingData,
  Training,
  Turn,
} from '@/src/types/api';

import DBConnection from '../DBConnection';
import { CRUDRepository } from '../repository';
import { TeamModelName } from './team';

export const TrainingModelName = 'Training';
export const BattleModelName = 'Battle';

const ActionTypeEnumList: TupleUnion<Action['type']> = [
  'move',
  'switch',
  'ability',
  'effect',
];

const PlayerEnumList: TupleUnion<Exclude<Action['player'], undefined>> = [
  'p1',
  'p2',
  'p3',
  'p4',
];

const ActionSchema = new Schema<Action>({
  index: { type: Number, required: true },
  type: {
    type: String,
    requried: true,
    enum: ActionTypeEnumList,
  },
  user: { type: String },
  player: { type: String, enum: PlayerEnumList },
  targets: [{ type: String, required: true }],
  name: { type: String, required: true },
});

const TurnSchema = new Schema<Turn>({
  index: { type: Number, required: true },
  actions: [{ type: ActionSchema, required: true }],
});

const BattleResultEnumList: TupleUnion<Exclude<Battle['result'], undefined>> = [
  'win',
  'loose',
  'tie',
];

const BaseBattleFields = {
  team: { ref: TeamModelName, type: Schema.Types.ObjectId },
  season: { type: Number },
  format: { type: String },
};

export const BattleSchema = new Schema<Battle>(
  {
    name: { type: String, required: true },
    notes: { type: String },
    turns: [{ type: TurnSchema, required: true }],
    result: {
      type: String,
      requried: true,
      enum: BattleResultEnumList,
    },
    ...BaseBattleFields,
  },
  {
    id: true,
    timestamps: true,
  },
);

BattleSchema.path('createdAt').get((val?: Date) => val?.toISOString?.());
BattleSchema.path('updatedAt').get((val?: Date) => val?.toISOString?.());

export const TrainingSchema = new Schema<Training>(
  {
    name: { type: String, required: true },
    description: { type: String },
    isDefault: { type: Boolean, required: true },
    battles: [{ type: Schema.Types.ObjectId, ref: BattleModelName }],
    ...BaseBattleFields,
  },
  {
    id: true,
    timestamps: true,
  },
);

TrainingSchema.path('createdAt').get((val?: Date) => val?.toISOString?.());
TrainingSchema.path('updatedAt').get((val?: Date) => val?.toISOString?.());

export class BattleRepository implements CRUDRepository<Battle> {
  protected model: Model<Battle>;

  constructor() {
    this.model =
      (models[BattleModelName] as Model<Battle>) ||
      DBConnection.getConnection().model(BattleModelName, BattleSchema);
  }

  async updateById(id: string, updateData: Partial<Battle>): Promise<Battle> {
    const battle = await this.model.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!battle) {
      throw new BattleNotFoundError(id);
    }
    return battle.toObject();
  }

  async deleteById(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }

  async getById(id: string): Promise<Battle> {
    const battle = await this.model.findById(id);
    if (!battle) {
      throw new BattleNotFoundError(id);
    }
    return battle.toObject();
  }

  async create(battle: CreateBattleData): Promise<Battle> {
    const createdBattle = await this.model.create({ ...battle });
    await createdBattle.populate('team');
    return createdBattle.toObject();
  }
}

export class BattleNotFoundError extends Error {
  id: string;
  constructor(id: string) {
    super(`Battle with id ${id} not found`);
    this.id = id;
  }
}

export default class TrainingRepository implements CRUDRepository<Training> {
  protected model: Model<Training>;
  protected battleRepository: BattleRepository;

  constructor() {
    this.model =
      (models[TrainingModelName] as Model<Training>) ||
      DBConnection.getConnection().model(TrainingModelName, TrainingSchema);
    this.battleRepository = new BattleRepository();
  }

  async updateById(
    id: string,
    updateData: Partial<Training>,
  ): Promise<Training> {
    const training = await this.model.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!training) {
      throw new TrainingNotFoundError(id);
    }
    return training.toObject();
  }

  async deleteById(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }

  async getById(id: string): Promise<Training> {
    const training = await this.model.findById(id);
    if (!training) {
      throw new TrainingNotFoundError(id);
    }
    await training.populate('battles');
    await training.populate('team');
    return training.toObject();
  }

  async create(model: CreateTrainingData): Promise<Training> {
    const training = await this.model.create({
      ...model,
      battles: [],
      isDefault: false,
    });
    await training.populate('team');
    return training.toObject();
  }

  async addNewBattle(
    trainingId: string,
    battle: CreateBattleData,
  ): Promise<Battle> {
    const training = await this.model.findById(trainingId);
    if (!training) throw new TrainingNotFoundError(trainingId);
    const battleData: CreateBattleData = {
      team: training.team,
      season: training.season,
      format: training.format,
      ...battle,
    };
    const createdBattle = await this.battleRepository.create(battleData);
    await this.model.findByIdAndUpdate(trainingId, {
      $push: { battles: createdBattle.id },
    });
    return createdBattle;
  }

  async deleteBattle(trainingId: string, battleId: string) {
    const training = await this.model.findById(trainingId);
    if (!training) return;
    await training.populate('battles');
    if (!training.battles.some((b) => b.id === battleId)) return;
    await this.model.findByIdAndUpdate(trainingId, {
      $pull: { battles: battleId },
    });
    return await this.battleRepository.deleteById(battleId);
  }

  async updateBattle(
    trainingId: string,
    battleId: string,
    data: Partial<Battle>,
  ) {
    const training = await this.model.findById(trainingId);
    if (!training) throw new TrainingNotFoundError(trainingId);
    await training.populate('battles');
    if (!training.battles.some((b) => b.id === battleId)) {
      throw new BattleNotFoundError(battleId);
    }
    return await this.battleRepository.updateById(battleId, data);
  }
}

export class TrainingNotFoundError extends Error {
  id: string;
  constructor(id: string) {
    super(`Training with id ${id} not found`);
    this.id = id;
  }
}
