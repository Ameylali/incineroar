import z, { ZodType } from 'zod';

import DBConnection from '@/src/db/DBConnection';
import UserRepository from '@/src/db/models/user';
import { CreateTeamData } from '@/src/types/api';
import { validators } from '@/src/utils/validators';

export const createTeamDataSchema = z.object({
  name: validators.teamName,
  description: validators.description,
  data: validators.data,
  season: validators.season,
  format: validators.format,
  tags: validators.limitedTags,
}) satisfies ZodType<CreateTeamData>;

export const validateCreateTeamData = (data: unknown) => {
  return createTeamDataSchema.safeParse(data);
};

export const createTeamForUser = async (
  userId: string,
  teamData: CreateTeamData,
) => {
  await DBConnection.connect();

  const userRepo = new UserRepository();
  const team = await userRepo.addNewTeam(userId, teamData);

  return team;
};
