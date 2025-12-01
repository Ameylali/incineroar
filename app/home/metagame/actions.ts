'use server';

import z from 'zod';

import { verifyUserAuth } from '@/src/actions/auth';
import { baseFormActionErrorHandler } from '@/src/actions/error-handlers';
import DBConnection from '@/src/db/DBConnection';
import TournamentRepository from '@/src/db/models/tournament';
import TournamentParserFactory, {
  PokedataRawData,
} from '@/src/services/pokemon/tournament';
import { AddTournamentFormData, FormActionState } from '@/src/types/form';

export type CreateTournamentActionState =
  FormActionState<AddTournamentFormData>;

const addTournamentFormDataSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name must be at least 1 characters')
    .max(40, 'Name must be at most 40 characters'),
  source: z.union([z.literal('pokedata')], 'Invalid data source'),
  data: z.string().min(1, 'Data must be at least 1 characters'),
  season: z
    .number()
    .min(2008)
    .max(new Date().getFullYear() + 1),
  format: z
    .string()
    .min(1, 'Format must be at least 1 characters')
    .max(50, 'Format must be at most 50 characters'),
});

export const createTournament = async (
  _state: CreateTournamentActionState,
  formData: FormData,
): Promise<CreateTournamentActionState> => {
  const rawData = {
    name: formData.get('name') as string,
    season: Number(formData.get('season')),
    format: formData.get('format') as string,
    source: formData.get('source') as string,
    data: formData.get('data') as string,
  };
  console.log(rawData);

  const validatedFields = addTournamentFormDataSchema.safeParse(rawData);

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

    const tournamentRepo = new TournamentRepository();
    const parser = TournamentParserFactory.getParser(
      validatedFields.data.source,
    );
    const createData = await parser.parse(
      validatedFields.data,
      JSON.parse(validatedFields.data.data) as PokedataRawData[],
    );
    const { teams: _, ...tournament } = await tournamentRepo.create(createData);
    console.log('Tournament successfully created', tournament);
  } catch (error) {
    console.error('Failed to create tournament', error);
    if (error instanceof SyntaxError) {
      return {
        success: false,
        data: validatedFields.data,
        error: 'Invalid JSON data',
      };
    }
    return baseFormActionErrorHandler(
      error,
      validatedFields.data,
      'Failed to add tournament. Try again later',
    );
  }

  return { success: true };
};
