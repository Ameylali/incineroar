import { NextRequest, NextResponse } from 'next/server';

import { verifyUserAuth } from '@/src/actions/auth';
import { baseErrorHandler } from '@/src/actions/error-handlers';
import DBConnection from '@/src/db/DBConnection';
import {
  BattleNotFoundError,
  TrainingNotFoundError,
} from '@/src/db/models/training';
import UserRepository from '@/src/db/models/user';
import { ErrorResponse } from '@/src/types/api';
import { DELETE_BATTLE, GET_BATTLE } from '@/src/types/endpoints';

export const GET = async (
  req: NextRequest,
  ctx: RouteContext<'/api/user/training/[trainingId]/battle/[battleId]'>,
): Promise<NextResponse<GET_BATTLE | ErrorResponse>> => {
  try {
    await DBConnection.connect();
    const userRepo = new UserRepository();

    const { id: userId } = await verifyUserAuth();
    const { trainingId, battleId } = await ctx.params;
    const battle = await userRepo.getBattleById(userId, trainingId, battleId);
    return NextResponse.json({ battle });
  } catch (error) {
    console.error('Failed to get training', error);
    if (error instanceof BattleNotFoundError) {
      return NextResponse.json(
        { message: 'Battle not found' },
        { status: 404 },
      );
    }
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
  ctx: RouteContext<'/api/user/training/[trainingId]/battle/[battleId]'>,
): Promise<NextResponse<DELETE_BATTLE | ErrorResponse>> => {
  try {
    await DBConnection.connect();
    const userRepo = new UserRepository();

    const { id: userId } = await verifyUserAuth();
    const { trainingId, battleId } = await ctx.params;
    await userRepo.deleteBattle(userId, trainingId, battleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to get training', error);
    if (error instanceof BattleNotFoundError) {
      return NextResponse.json(
        { message: 'Battle not found' },
        { status: 404 },
      );
    }
    if (error instanceof TrainingNotFoundError) {
      return NextResponse.json(
        { message: 'Training not found' },
        { status: 404 },
      );
    }
    return baseErrorHandler(error, req);
  }
};
