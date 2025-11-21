import { NextResponse } from 'next/server';

import { ErrorResponse } from '../types/api';
import { MissingDBConnectionError } from '../utils/errors';
import { UnauthenticatedError, UnauthorizedError } from './auth';

export const baseErrorHandler = (
  error: unknown,
): NextResponse<ErrorResponse> => {
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json<ErrorResponse>(
      { message: 'User not authenticaded' },
      {
        status: 401,
      },
    );
  }
  if (error instanceof UnauthorizedError) {
    return NextResponse.json<ErrorResponse>(
      { message: 'User not authorized' },
      {
        status: 403,
      },
    );
  }
  if (error instanceof MissingDBConnectionError) {
    return NextResponse.json<ErrorResponse>(
      { message: 'DB not available' },
      {
        status: 500,
      },
    );
  }
  return NextResponse.json<ErrorResponse>(
    { message: 'Unexpected error' },
    {
      status: 500,
    },
  );
};
