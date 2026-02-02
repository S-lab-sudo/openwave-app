'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to retrieve the server-generated guest ID from cookies.
 */
export function useGuestUser() {
    const [guestId, setGuestId] = useState<string | null>(null);

    useEffect(() => {
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return null;
        };

        const id = getCookie('guest_id');
        setGuestId(id || null);
    }, []);

    return guestId;
}
