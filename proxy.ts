import { Route } from 'next';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes: Route[] = ['/home'];

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};

const protectedRouteProxy = async (req: NextRequest) => {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('jwt');
  if (!jwt) {
    return NextResponse.redirect(new URL('/auth', req.nextUrl));
  }
  return NextResponse.next();
};

const proxy = async (req: NextRequest) => {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route),
  );

  if (isProtectedRoute) {
    return protectedRouteProxy(req);
  }

  return NextResponse.next();
};

export default proxy;
