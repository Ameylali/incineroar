'use server';

import { decode } from '@razr/formdata';
import z from 'zod';

import { verifyUserAuth } from '@/src/actions/auth';
import { baseFormActionErrorHandler } from '@/src/actions/error-handlers';
import DBConnection from '@/src/db/DBConnection';
import { TeamNotFoundError } from '@/src/db/models/team';
import {
  BattleNotFoundError,
  TrainingNotFoundError,
} from '@/src/db/models/training';
import UserRepository from '@/src/db/models/user';
import { Action, Team } from '@/src/types/api';
import {
  AddTrainingFormData,
  EditBattleFormData,
  EditTrainingFormData,
  FormActionState,
} from '@/src/types/form';

export type AddTrainingActionState = FormActionState<AddTrainingFormData>;

const addTrainingFormDataSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name must be at least 1 characters')
    .max(40, 'Name must be at most 40 characters'),
  teamId: z.string().trim().optional(),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be at most 500 characters'),
  season: z
    .number()
    .min(2008)
    .max(new Date().getFullYear() + 1)
    .optional(),
  format: z
    .string()
    .min(1, 'Format must be at least 1 characters')
    .max(50, 'Format must be at most 50 characters')
    .optional(),
});

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

  const validatedFields = addTrainingFormDataSchema.safeParse(rawData);

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
    const createData = {
      ...validatedFields.data,
      team,
      description: validatedFields.data.description ?? '',
    };
    const training = await userRepo.addNewTraining(userId, createData);

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
});

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

const actionTypes: Action['type'][] = ['move', 'switch', 'ability', 'effect'];

const actionFormDataSchema = z.object({
  index: z.number(),
  type: z.union(
    actionTypes.map((val) => z.literal(val)),
    'Invalid action type',
  ),
  name: z.string(),
  user: z.string(),
  targets: z
    .array(z.string().max(50, 'At most 100 characters'))
    .max(10, 'At most 10 targets'),
});

const turnFormDataSchema = z.object({
  index: z.number(),
  actions: z.array(actionFormDataSchema),
});

const battleFormDataSchema = z.object({
  id: z.string().min(1, 'Invalid id').max(50, 'Invalid id'),
  trainingId: z.string().min(1, 'Invalid id').max(50, 'Invalid id'),
  name: z
    .string()
    .min(1, 'At least one character')
    .max(100, 'At most 100 characters'),
  teamId: z.string().min(1, 'Invalid id').max(50, 'Invalid id').optional(),
  season: z
    .number()
    .min(2008)
    .max(new Date().getFullYear() + 1)
    .optional(),
  format: z
    .string()
    .min(1, 'Format must be at least 1 characters')
    .max(50, 'Format must be at most 50 characters')
    .optional(),
  notes: z.string().max(1000, 'At most 1000 characters'),
  turns: z.array(turnFormDataSchema),
});

export const editBattle = async (
  _state: EditBattleFormActionState,
  formData: FormData,
): Promise<EditBattleFormActionState> => {
  const rawData = decode(formData) as unknown as EditBattleFormData;
  rawData.season = rawData?.season ? Number(rawData.season) : undefined;
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
      data: rawData,
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
    let team: Team | undefined = undefined;
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
