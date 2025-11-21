import { cookies } from 'next/headers';

import AuthService from '../services/auth';
import { UnsensitiveUserData } from '../types/api';

export const verifyUserAuth = async (): Promise<UnsensitiveUserData> => {
  const authService = new AuthService();
  const cookieStore = await cookies();
  const jwt = cookieStore.get('jwt')?.value;
  if (!jwt) {
    throw new UnauthenticatedError();
  }
  const verifyResult = await authService.verifyUserJwt(jwt);
  if (!verifyResult.verified || !verifyResult.user) {
    throw new UnauthorizedError();
  }
  return verifyResult.user;
};

export class UnauthenticatedError extends Error {}
export class UnauthorizedError extends Error {}
