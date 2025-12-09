import { NextRequest, NextResponse } from 'next/server';

import { verifyUserAuth } from '@/src/actions/auth';
import { baseErrorHandler } from '@/src/actions/error-handlers';
import DBConnection from '@/src/db/DBConnection';
import UserRepository from '@/src/db/models/user';
import { ErrorResponse } from '@/src/types/api';
import { DELETE_TRAINING } from '@/src/types/endpoints';

export const DELETE = async (
  req: NextRequest,
  ctx: RouteContext<'/api/user/training/[id]'>,
): Promise<NextResponse<DELETE_TRAINING | ErrorResponse>> => {
  try {
    await DBConnection.connect();
    const userRepo = new UserRepository();

    const { id: userId } = await verifyUserAuth();
    const { id: trainingId } = await ctx.params;
    await userRepo.deleteTraining(userId, trainingId);
    console.log(`Deleted training ${trainingId} for user ${userId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Failed to delete training`, error);
    return baseErrorHandler(error, req);
  }
};
