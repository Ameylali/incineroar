import { NextRequest, NextResponse } from 'next/server';

import { UnauthorizedError, verifyUserAuth } from '@/src/actions/auth';
import { baseErrorHandler } from '@/src/actions/error-handlers';
import DBConnection from '@/src/db/DBConnection';
import TournamentRepository, {
  TournamentNotFoundError,
} from '@/src/db/models/tournament';
import AnalyticsService from '@/src/services/pokemon/analytics';
import { ErrorResponse } from '@/src/types/api';
import { DELETE_TOURNAMENT, GET_TOURNAMENT } from '@/src/types/endpoints';

export const GET = async (
  req: NextRequest,
  ctx: RouteContext<'/api/tournament/[id]'>,
): Promise<NextResponse<GET_TOURNAMENT | ErrorResponse>> => {
  try {
    await DBConnection.connect();
    await verifyUserAuth();

    const tournamentRepo = new TournamentRepository();
    const analyticsService = new AnalyticsService();
    const { id } = await ctx.params;
    const tournament = await tournamentRepo.getById(id);
    let analysis;
    try {
      analysis = await analyticsService.getAnalytics(tournament.teams);
    } catch (error) {
      console.error('Failed to get analysis', error);
    }

    return NextResponse.json({ tournament, analysis });
  } catch (error) {
    console.error(`Failed to get team`, error);
    if (error instanceof TournamentNotFoundError) {
      return NextResponse.json<ErrorResponse>(
        { message: 'Tournament not found' },
        {
          status: 404,
        },
      );
    }
    return baseErrorHandler(error, req);
  }
};

export const DELETE = async (
  req: NextRequest,
  ctx: RouteContext<'/api/tournament/[id]'>,
): Promise<NextResponse<DELETE_TOURNAMENT | ErrorResponse>> => {
  try {
    await DBConnection.connect();
    const { role } = await verifyUserAuth();

    if (role !== 'admin') {
      throw new UnauthorizedError();
    }

    const tournamentRepo = new TournamentRepository();

    const { id } = await ctx.params;
    await tournamentRepo.deleteById(id);
    console.log(`Deleted tournament ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Failed to delete tournament`, error);
    return baseErrorHandler(error, req);
  }
};
