'use server';

import z from 'zod';

import { verifyUserAuth } from '@/src/actions/auth';
import { baseFormActionErrorHandler } from '@/src/actions/error-handlers';
import DBConnection from '@/src/db/DBConnection';
import { TeamNotFoundError } from '@/src/db/models/team';
import UserRepository from '@/src/db/models/user';
import { Team } from '@/src/types/api';
import {
  AddTrainingFormData,
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
