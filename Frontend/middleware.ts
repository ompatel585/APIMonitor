import { NextResponse, type NextRequest } from 'next/server';

// Route protection happens client-side (see providers/auth-provider.tsx and
// app/(dashboard)/layout.tsx). The refresh-token cookie is scoped by the
// backend to its own origin and path (/api/v1/auth), so it is never sent to
// this Next.js server in a cross-origin dev/prod split — middleware cannot
// see it and must not try to.
export function middleware(_request: NextRequest): NextResponse {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
