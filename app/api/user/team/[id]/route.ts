import { NextRequest, NextResponse } from 'next/server';

import { verifyUserAuth } from '@/src/actions/auth';
import { baseErrorHandler } from '@/src/actions/error-handlers';
import DBConnection from '@/src/db/DBConnection';
import { TeamNotFoundError } from '@/src/db/models/team';
import UserRepository from '@/src/db/models/user';
import { ErrorResponse, Team } from '@/src/types/api';
import { DELETE_TEAM } from '@/src/types/endpoints';

export const GET = async (
  req: NextRequest,
  ctx: RouteContext<'/api/user/team/[id]'>,
): Promise<NextResponse<{ team: Team } | ErrorResponse>> => {
  try {
    await DBConnection.connect();
    const userRepo = new UserRepository();

    const { id: userId } = await verifyUserAuth();
    const { id: teamId } = await ctx.params;
    const team = await userRepo.getTeamById(userId, teamId);

    return NextResponse.json({ team });
  } catch (error) {
    console.error(`Failed to get team`, error);
    if (error instanceof TeamNotFoundError) {
      return NextResponse.json<ErrorResponse>(
        { message: 'Team not found' },
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
  ctx: RouteContext<'/api/user/team/[id]'>,
): Promise<NextResponse<DELETE_TEAM | ErrorResponse>> => {
  try {
    await DBConnection.connect();
    const userRepo = new UserRepository();

    const { id: userId } = await verifyUserAuth();
    const { id: teamId } = await ctx.params;
    await userRepo.deleteTeam(userId, teamId);
    console.log(`Deleted team ${teamId} for user ${userId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Failed to delete team`, error);
    return baseErrorHandler(error, req);
  }
};
