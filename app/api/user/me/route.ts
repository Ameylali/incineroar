import { NextResponse } from 'next/server';

import { verifyUserAuth } from '@/src/actions/auth';
import { baseErrorHandler } from '@/src/actions/error-handlers';
import DBConnection from '@/src/db/DBConnection';
import UserRepository from '@/src/db/models/user';
import { ErrorResponse, ExposedUser } from '@/src/types/api';

export const GET = async (): Promise<
  NextResponse<{ user: ExposedUser } | ErrorResponse>
> => {
  try {
    await DBConnection.connect();
    const userRepo = new UserRepository();

    const { id } = await verifyUserAuth();
    const { password: _, ...user } = await userRepo.getById(id);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Failed to get user', error);
    return baseErrorHandler(error);
  }
};
