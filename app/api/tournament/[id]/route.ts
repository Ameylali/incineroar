import { NextRequest, NextResponse } from 'next/server';

import { verifyUserAuth } from '@/src/actions/auth';
import { baseErrorHandler } from '@/src/actions/error-handlers';
import DBConnection from '@/src/db/DBConnection';
import TournamentRepository from '@/src/db/models/tournament';
import { ErrorResponse } from '@/src/types/api';
import { DELETE_TOURNAMENT } from '@/src/types/endpoints';

// export const GET = async (
//   req: NextRequest,
//   ctx: RouteContext<'/api/tournament/[id]'>,
// ): Promise<NextResponse<{} | ErrorResponse>> => {
//   try {
//     await DBConnection.connect();
//     const userRepo = new UserRepository();

//     const { id: userId } = await verifyUserAuth();
//     const { id: teamId } = await ctx.params;
//     const team = await userRepo.getTeamById(userId, teamId);

//     return NextResponse.json({ team });
//   } catch (error) {
//     console.error(`Failed to get team`, error);
//     if (error instanceof TeamNotFoundError) {
//       return NextResponse.json<ErrorResponse>(
//         { message: 'Team not found' },
//         {
//           status: 404,
//         },
//       );
//     }
//     return baseErrorHandler(error, req);
//   }
// };

export const DELETE = async (
  req: NextRequest,
  ctx: RouteContext<'/api/tournament/[id]'>,
): Promise<NextResponse<DELETE_TOURNAMENT | ErrorResponse>> => {
  try {
    await DBConnection.connect();
    await verifyUserAuth();

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
