'use server';

import { decode } from '@razr/formdata';
import z, { ZodType } from 'zod';

import { UnauthorizedError, verifyUserAuth } from '@/src/actions/auth';
import { baseFormActionErrorHandler } from '@/src/actions/error-handlers';
import {
  createTeamDataSchema,
  createTeamForUser,
  validateCreateTeamData,
} from '@/src/actions/team';
import DBConnection from '@/src/db/DBConnection';
import TeamRepository, { TeamNotFoundError } from '@/src/db/models/team';
import { UserNotFoundError } from '@/src/db/models/user';
import { CreateTeamData, UpdateTeamData } from '@/src/types/api';
import { FormActionState } from '@/src/types/form';

export type CreateTeamActionState = FormActionState<CreateTeamData>;

export const createTeam = async (
  _initialState: CreateTeamActionState,
  formData: FormData,
): Promise<CreateTeamActionState> => {
  const rawData = decode(formData) as unknown as CreateTeamData;
  rawData.tags = rawData.tags ?? [];
  rawData.season = Number(rawData.season ?? 0);

  const validatedFields = validateCreateTeamData(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      data: JSON.parse(JSON.stringify(rawData)) as CreateTeamData,
      errors: z.treeifyError(validatedFields.error).properties,
    };
  }

  try {
    const { id: userId } = await verifyUserAuth();
    const team = await createTeamForUser(userId, validatedFields.data);
    console.log('Team created successfully', team);
  } catch (error) {
    console.error('Failed to create team', error);
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
}) satisfies ZodType<UpdateTeamData>;

export const updateTeam = async (
  _initialState: UpdateTeamActionState,
  formData: FormData,
): Promise<UpdateTeamActionState> => {
  const rawData = decode(formData) as unknown as UpdateTeamData;
  rawData.tags = rawData.tags ?? [];
  rawData.season = Number(rawData.season ?? 0);

  const validatedFields = updateTeamDataSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      data: JSON.parse(JSON.stringify(rawData)) as UpdateTeamData,
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
