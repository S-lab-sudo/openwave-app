import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';


export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // Check if guest_id cookie exists
    const guestId = request.cookies.get('guest_id');

    if (!guestId) {
        // Generate new guest ID if it doesn't exist
        const newGuestId = crypto.randomUUID();
        response.cookies.set('guest_id', newGuestId, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365, // 1 year
            httpOnly: true,
            sameSite: 'lax',
        });
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
