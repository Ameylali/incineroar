import { NextRequest, NextResponse } from 'next/server';

import { baseErrorHandler } from '@/src/actions/error-handlers';
import { importTournamentData } from '@/src/actions/scrap';
import { ErrorResponse } from '@/src/types/api';
import { GET_IMPORT_TOURNAMENT } from '@/src/types/endpoints';

export const GET = async (
  req: NextRequest,
): Promise<NextResponse<GET_IMPORT_TOURNAMENT | ErrorResponse>> => {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      {
        status: 401,
      },
    );
  }

  try {
    const tournaments = await importTournamentData();

    return NextResponse.json({
      message: `Imported ${tournaments.length} tournaments`,
    });
  } catch (error) {
    return baseErrorHandler(error, req);
  }
};
