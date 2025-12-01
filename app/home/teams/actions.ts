'use server';

import z from 'zod';

import { UnauthorizedError, verifyUserAuth } from '@/src/actions/auth';
import { baseFormActionErrorHandler } from '@/src/actions/error-handlers';
import DBConnection from '@/src/db/DBConnection';
import TeamRepository, { TeamNotFoundError } from '@/src/db/models/team';
import UserRepository, { UserNotFoundError } from '@/src/db/models/user';
import { CreateTeamData, UpdateTeamData } from '@/src/types/api';
import { FormActionState } from '@/src/types/form';

export type CreateTeamActionState = FormActionState<CreateTeamData>;

const createTeamDataSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name must be at least 1 characters')
    .max(40, 'Name must be at most 40 characters'),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters'),
  data: z
    .string()
    .min(1, 'Data must be at least 1 characters')
    .max(5000, 'Data must be at most 5000 characters'),
  season: z
    .number()
    .min(2008)
    .max(new Date().getFullYear() + 1),
  format: z
    .string()
    .min(1, 'Format must be at least 1 characters')
    .max(50, 'Format must be at most 50 characters'),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'Tag must be at least 1 character')
        .max(20, 'Tag must be at most 20 characters'),
    )
    .max(10, 'At most 10 tags are allowed'),
});

export const createTeam = async (
  _initialState: CreateTeamActionState,
  formData: FormData,
): Promise<CreateTeamActionState> => {
  const rawData = {
    name: formData.get('name') as string,
    description: (formData.get('description') || '') as string,
    data: formData.get('data') as string,
    season: Number(formData.get('season')),
    format: formData.get('format') as string,
    tags: (formData.getAll('tags') || []) as string[],
  };

  const validatedFields = createTeamDataSchema.safeParse(rawData);

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
    const team = await userRepo.addNewTeam(userId, validatedFields.data);
    console.log('Team created successfully', team);
  } catch (error) {
    console.error('Failed to create user', error);
    return baseFormActionErrorHandler(
      error,
      validatedFields.data,
      'Could not import team. Try again later',
    );
  }

  return {
    success: true,
  };
};

export type UpdateTeamActionState = FormActionState<UpdateTeamData>;

const updateTeamDataSchema = createTeamDataSchema.extend({
  id: z.string().trim().min(1, 'Invalid team ID'),
});

export const updateTeam = async (
  _initialState: UpdateTeamActionState,
  formData: FormData,
): Promise<UpdateTeamActionState> => {
  const rawData = {
    id: formData.get('id') as string,
    name: formData.get('name') as string,
    description: (formData.get('description') || '') as string,
    data: formData.get('data') as string,
    season: Number(formData.get('season')),
    format: formData.get('format') as string,
    tags: (formData.getAll('tags') || []) as string[],
  };

  console.debug('Raw update team data:', rawData);

  const validatedFields = updateTeamDataSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      data: rawData,
      errors: z.treeifyError(validatedFields.error).properties,
    };
  }

  try {
    await DBConnection.connect();
    await verifyUserAuth();

    const teamsRepo = new TeamRepository();
    const { id, ...data } = validatedFields.data;
    await teamsRepo.updateById(id, data);
    console.log(`Team ${id} updated succesfully`, data);
  } catch (error) {
    console.error('Failed to create user', error);
    if (
      error instanceof UserNotFoundError ||
      error instanceof UnauthorizedError
    ) {
      return {
        success: false,
        data: validatedFields.data,
        error: 'User not found',
      };
    }
    if (error instanceof TeamNotFoundError) {
      return {
        success: false,
        data: validatedFields.data,
        error: 'Team not found',
      };
    }
    return {
      success: false,
      data: validatedFields.data,
      error: 'Could not import team. Try again later',
    };
  }

  return {
    success: true,
  };
};
