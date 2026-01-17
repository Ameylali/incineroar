'use server';

import { decode } from '@razr/formdata';
import z, { ZodType } from 'zod';

import { verifyUserAuth } from '@/src/actions/auth';
import { baseFormActionErrorHandler } from '@/src/actions/error-handlers';
import {
  addTrainingFormDataSchema,
  createTrainingForUser,
  validateCreateTrainingData,
} from '@/src/actions/training';
import DBConnection from '@/src/db/DBConnection';
import { TeamNotFoundError } from '@/src/db/models/team';
import {
  BattleNotFoundError,
  TrainingNotFoundError,
} from '@/src/db/models/training';
import UserRepository from '@/src/db/models/user';
import BattleParserFactory, {
  BattleMetadata,
} from '@/src/services/pokemon/battle';
import { TupleUnion } from '@/src/types';
import { Action, Battle, Team } from '@/src/types/api';
import {
  AddTrainingFormData,
  BattleDataSource,
  EditBattleFormData,
  EditTrainingFormData,
  FormActionState,
  ImportBattlesFormData,
} from '@/src/types/form';

export type AddTrainingActionState = FormActionState<AddTrainingFormData>;

export const createTraining = async (
  _state: AddTrainingActionState,
  formData: FormData,
): Promise<AddTrainingActionState> => {
  const rawData = {
    name: formData.get('name') as string,
    season: formData.get('season') ? Number(formData.get('season')) : undefined,
    format: (formData.get('format') as string) ?? undefined,
    teamId: (formData.get('teamId') as string) ?? undefined,
    description: formData.get('description') as string,
  };

  const validatedFields = validateCreateTrainingData(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      data: rawData,
      errors: z.treeifyError(validatedFields.error).properties,
    };
  }

  try {
    const { id: userId } = await verifyUserAuth();
    const training = await createTrainingForUser(userId, validatedFields.data);
    console.log('Training created successfully', training);
  } catch (error) {
    if (error instanceof TeamNotFoundError) {
      return {
        success: false,
        data: validatedFields.data,
        error: 'Team not found',
      };
    }
    return baseFormActionErrorHandler<AddTrainingFormData>(
      error,
      validatedFields.data,
      'Unexpected error',
    );
  }

  return { success: true };
};

export type EditTrainingActionState = FormActionState<EditTrainingFormData>;

const updateTrainingFormDataSchema = addTrainingFormDataSchema.extend({
  id: z.string().trim().min(1, 'Invalid trianing ID'),
}) satisfies ZodType<EditTrainingFormData>;

export const editTraining = async (
  _state: EditTrainingActionState,
  formData: FormData,
): Promise<EditTrainingActionState> => {
  const rawData = {
    id: formData.get('id') as string,
    name: formData.get('name') as string,
    season: formData.get('season') ? Number(formData.get('season')) : undefined,
    format: (formData.get('format') as string) ?? undefined,
    teamId: (formData.get('teamId') as string) ?? undefined,
    description: formData.get('description') as string,
  };

  const validatedFields = updateTrainingFormDataSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      data: rawData,
      errors: z.treeifyError(validatedFields.error).properties,
    };
  }

  try {
    await DBConnection.connect();
    const { id: userId } = await verifyUserAuth();

    const userRepo = new UserRepository();
    let team: Team | undefined = undefined;
    if (validatedFields.data.teamId) {
      team = await userRepo.getTeamById(userId, validatedFields.data.teamId);
    }
    const updateData = {
      ...validatedFields.data,
      id: undefined,
      team,
    };
    const training = await userRepo.updateTraining(
      userId,
      validatedFields.data.id,
      updateData,
    );

    console.log('Training updated successfully', training);
  } catch (error) {
    if (error instanceof TeamNotFoundError) {
      return {
        success: false,
        data: validatedFields.data,
        error: 'Team not found',
      };
    }
    return baseFormActionErrorHandler<EditTrainingFormData>(
      error,
      validatedFields.data,
      'Unexpected error',
    );
  }

  return { success: true };
};

export type EditBattleFormActionState = FormActionState<EditBattleFormData>;

const actionTypes: TupleUnion<Action['type']> = [
  'move',
  'switch',
  'ability',
  'effect',
];
const playerTypes: TupleUnion<
  Exclude<Action['player'], undefined | 'p3' | 'p4'>
> = ['p1', 'p2'];

const actionFormDataSchema = z.object({
  index: z.number(),
  player: z
    .union(
      playerTypes.map((val) => z.literal(val)),
      'Invalid player',
    )
    .optional(),
  type: z.union(
    actionTypes.map((val) => z.literal(val)),
    'Invalid action type',
  ),
  name: z.string(),
  user: z.string(),
  targets: z
    .array(z.string().max(50, 'At most 100 characters'))
    .max(10, 'At most 10 targets'),
}) satisfies ZodType<Action>;

const turnFormDataSchema = z.object({
  index: z.number(),
  actions: z.array(actionFormDataSchema),
});

const battleResults: TupleUnion<Exclude<Battle['result'], undefined>> = [
  'win',
  'loose',
  'tie',
];

const battleFormDataSchema = z.object({
  id: z.string().min(1, 'Invalid id').max(50, 'Invalid id'),
  trainingId: z.string().min(1, 'Invalid id').max(50, 'Invalid id'),
  name: z
    .string()
    .min(1, 'At least one character')
    .max(100, 'At most 100 characters'),
  result: z
    .union(
      battleResults.map((val) => z.literal(val)),
      'Invalid result',
    )
    .optional(),
  teamId: z.string().min(1, 'Invalid id').max(50, 'Invalid id').optional(),
  season: z
    .number()
    .min(2008)
    .max(new Date().getFullYear() + 1)
    .optional(),
  format: z.string().max(50, 'Format must be at most 50 characters').optional(),
  notes: z.string().max(1000, 'At most 1000 characters'),
  turns: z.array(turnFormDataSchema),
}) satisfies ZodType<EditBattleFormData>;

export const editBattle = async (
  _state: EditBattleFormActionState,
  formData: FormData,
): Promise<EditBattleFormActionState> => {
  const rawData = decode(formData) as unknown as EditBattleFormData;
  rawData.season = rawData?.season ? Number(rawData.season) : undefined;
  rawData.turns = rawData.turns ?? [];
  rawData?.turns.forEach((turn) => {
    if (!turn) return;
    turn.index = Number(turn.index);
    turn.actions?.forEach((action) => {
      if (!action) return;
      action.index = Number(action.index);
      if (!action.targets) {
        action.targets = [];
      }
    });
  });
  const validatedFields = battleFormDataSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      data: JSON.parse(JSON.stringify(rawData)) as EditBattleFormData,
      errors: z.treeifyError(validatedFields.error).properties,
    };
  }

  try {
    await DBConnection.connect();

    const userRepo = new UserRepository();
    const { id: userId } = await verifyUserAuth();
    const {
      id: battleId,
      trainingId,
      teamId,
      ...updateData
    } = validatedFields.data;
    let team: Team | null = null;
    if (teamId) {
      team = await userRepo.getTeamById(userId, teamId);
    }

    const updatedBattle = await userRepo.updateBattle(
      userId,
      trainingId,
      battleId,
      {
        team,
        ...updateData,
      },
    );
    console.log('Updated battle', updatedBattle);
  } catch (error) {
    console.error('Faild to update battle', error);
    if (error instanceof TeamNotFoundError) {
      return {
        success: false,
        data: validatedFields.data,
        error: 'Team not found',
      };
    }
    if (error instanceof TrainingNotFoundError) {
      return {
        success: false,
        data: validatedFields.data,
        error: 'Training not found',
      };
    }
    if (error instanceof BattleNotFoundError) {
      return {
        success: false,
        data: validatedFields.data,
        error: 'Battle not found',
      };
    }
    return baseFormActionErrorHandler<EditBattleFormData>(
      error,
      validatedFields.data,
      'Unexpected error',
    );
  }

  return { success: true };
};

export const createBattle = async (trainingId: string) => {
  try {
    await DBConnection.connect();

    const userRepo = new UserRepository();
    const { id: userId } = await verifyUserAuth();
    const battle = await userRepo.addNewBattle(userId, trainingId, {
      name: `Battle on ${new Date().toLocaleDateString()}`,
      notes: '',
      turns: [],
    });
    console.log(`Successfully created battle`, battle);
    return battle;
  } catch (error) {
    console.error('Error creating battle', error);
    return null;
  }
};

export type ImportBattlesFormActionState =
  FormActionState<ImportBattlesFormData>;

const dataSources: TupleUnion<BattleDataSource> = ['showdown-sim-protocol'];
const playerOptions: TupleUnion<
  Exclude<ImportBattlesFormData['battles'][0]['playerTag'], undefined>
> = ['p1', 'p2', 'p3', 'p4'];

const importBattlesFormDataSchema = z.object({
  trainingId: z.string().min(1, 'Invalid id').max(50, 'Invalid id'),
  source: z.union(
    dataSources.map((val) => z.literal(val)),
    'Invalid source',
  ),
  battles: z.array(
    z.object({
      name: z
        .string()
        .min(1, 'At leat 1 character')
        .max(100, 'At most 100 characters'),
      data: z
        .string()
        .min(1, 'At leat 1 character')
        .max(10000, 'At most 10000 characters'),
      playerTag: z.union(playerOptions.map((p) => z.literal(p))).optional(),
    }),
  ),
}) satisfies ZodType<ImportBattlesFormData>;

export const importBattles = async (
  _state: ImportBattlesFormActionState,
  formData: FormData,
): Promise<ImportBattlesFormActionState> => {
  const rawData = decode(formData) as unknown as ImportBattlesFormData;

  const validatedFields = importBattlesFormDataSchema.safeParse(rawData);
  if (!validatedFields.success) {
    return {
      success: false,
      data: rawData,
      errors: z.treeifyError(validatedFields.error).properties,
    };
  }

  try {
    await DBConnection.connect();
    const { id: userId } = await verifyUserAuth();

    const userRepo = new UserRepository();
    const parser = BattleParserFactory.getParser(validatedFields.data.source);
    const trainingId = validatedFields.data.trainingId;
    const promises = validatedFields.data.battles.map((battle) => {
      console.log('battle playerTag', battle.playerTag);
      const battleMetadata: BattleMetadata = {
        name: battle.name,
        notes: '',
        playerTag: battle.playerTag ?? 'p1',
      };
      const createBattleData = parser.parse(battleMetadata, battle.data);
      return userRepo.addNewBattle(userId, trainingId, createBattleData);
    });
    await Promise.all(promises);
    console.log('Successfully imported battles');
  } catch (error) {
    console.error('Failed to import battles', error);
    if (error instanceof TrainingNotFoundError) {
      return {
        success: false,
        data: validatedFields.data,
        error: 'Training not found',
      };
    }

    return baseFormActionErrorHandler<ImportBattlesFormData>(
      error,
      validatedFields.data,
      'Unexpected error',
    );
  }
  return {
    success: true,
  };
};
