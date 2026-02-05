import z, { ZodType } from 'zod';

import DBConnection from '@/src/db/DBConnection';
import TournamentRepository from '@/src/db/models/tournament';
import TournamentParserFactory, {
  PokedataRawData,
} from '@/src/services/pokemon/tournament';
import { TupleUnion } from '@/src/types';
import { AddTournamentFormData } from '@/src/types/form';

import { fetchRawData } from '../utils/fetch';

const tournamentDataSources: TupleUnion<AddTournamentFormData['source']> = [
  'pokedata',
  'pokedata_url',
];

const addTournamentFormDataSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name must be at least 1 characters')
    .max(40, 'Name must be at most 40 characters'),
  source: z.union(
    tournamentDataSources.map((val) => z.literal(val)),
    'Invalid data source',
  ),
  data: z.string().min(1, 'Data must be at least 1 characters'),
  season: z
    .number()
    .min(2008)
    .max(new Date().getFullYear() + 1),
  format: z
    .string()
    .min(1, 'Format must be at least 1 characters')
    .max(50, 'Format must be at most 50 characters'),
}) satisfies ZodType<AddTournamentFormData>;

export const validateCreateTournamentData = (data: unknown) => {
  return addTournamentFormDataSchema.safeParse(data);
};

export const createTournamentWithAuth = async (
  tournamentData: AddTournamentFormData,
) => {
  await DBConnection.connect();

  const tournamentRepo = new TournamentRepository();
  const processedData = { ...tournamentData };

  if (tournamentData.source === 'pokedata_url') {
    // Fetch pokedata from URL
    const response = await fetchRawData(tournamentData.data);

    processedData.data = JSON.stringify(response);
    processedData.source = 'pokedata';
  }

  const parser = TournamentParserFactory.getParser(
    processedData.source as 'pokedata',
  );
  const createData = await parser.parse(
    processedData,
    JSON.parse(processedData.data) as PokedataRawData[],
  );

  const tournament = await tournamentRepo.create(createData);
  return tournament;
};
