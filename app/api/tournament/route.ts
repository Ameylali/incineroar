import { NextRequest, NextResponse } from 'next/server';

import { verifyUserAuth } from '@/src/actions/auth';
import { baseErrorHandler } from '@/src/actions/error-handlers';
import DBConnection from '@/src/db/DBConnection';
import TournamentRepository from '@/src/db/models/tournament';
import { ErrorResponse } from '@/src/types/api';
import { GET_TOURNAMENTS } from '@/src/types/endpoints';

export const GET = async (
  req: NextRequest,
): Promise<NextResponse<GET_TOURNAMENTS | ErrorResponse>> => {
  try {
    await DBConnection.connect();
    await verifyUserAuth();

    const tournamentRepo = new TournamentRepository();
    const tournaments = await tournamentRepo.getAll();

    return NextResponse.json({ tournaments });
  } catch (error) {
    console.error('Failed to get tournaments', error);
    return baseErrorHandler(error, req);
  }
};
