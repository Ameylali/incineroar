import { NextRequest, NextResponse } from 'next/server';

import { verifyUserAuth } from '@/src/actions/auth';
import { baseErrorHandler } from '@/src/actions/error-handlers';
import DBConnection from '@/src/db/DBConnection';
import { TrainingNotFoundError } from '@/src/db/models/training';
import UserRepository from '@/src/db/models/user';
import { ErrorResponse } from '@/src/types/api';
import { DELETE_TRAINING, GET_TRAINING } from '@/src/types/endpoints';

export const GET = async (
  req: NextRequest,
  ctx: RouteContext<'/api/user/training/[trainingId]'>,
): Promise<NextResponse<GET_TRAINING | ErrorResponse>> => {
  try {
    await DBConnection.connect();
    const userRepo = new UserRepository();

    const { id: userId } = await verifyUserAuth();
    const { trainingId } = await ctx.params;
    const training = await userRepo.getTrainingById(userId, trainingId);
    return NextResponse.json({ training });
  } catch (error) {
    console.error('Failed to get training', error);
    if (error instanceof TrainingNotFoundError) {
      return NextResponse.json(
        { message: 'Training not found' },
        { status: 404 },
      );
    }
    return baseErrorHandler(error, req);
  }
};

export const DELETE = async (
  req: NextRequest,
  ctx: RouteContext<'/api/user/training/[trainingId]'>,
): Promise<NextResponse<DELETE_TRAINING | ErrorResponse>> => {
  try {
    await DBConnection.connect();
    const userRepo = new UserRepository();

    const { id: userId } = await verifyUserAuth();
    const { trainingId } = await ctx.params;
    await userRepo.deleteTraining(userId, trainingId);
    console.log(`Deleted training ${trainingId} for user ${userId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Failed to delete training`, error);
    return baseErrorHandler(error, req);
  }
};
