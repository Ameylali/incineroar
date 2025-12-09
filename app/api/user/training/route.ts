import { NextRequest, NextResponse } from 'next/server';

import { verifyUserAuth } from '@/src/actions/auth';
import { baseErrorHandler } from '@/src/actions/error-handlers';
import DBConnection from '@/src/db/DBConnection';
import UserRepository from '@/src/db/models/user';
import { ErrorResponse } from '@/src/types/api';
import { GET_TRAININGS } from '@/src/types/endpoints';

export const GET = async (
  req: NextRequest,
): Promise<NextResponse<GET_TRAININGS | ErrorResponse>> => {
  try {
    await DBConnection.connect();
    const { id } = await verifyUserAuth();

    const userRepo = new UserRepository();
    const trainings = await userRepo.getTrainings(id);
    trainings.reverse();

    return NextResponse.json({ trainings });
  } catch (error) {
    console.error('Failed to get trainings', error);
    return baseErrorHandler(error, req);
  }
};
