'use client';

import { ReactNode, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useContentStore } from '@/store/useContentStore';

export function Providers({ children }: { children: ReactNode }) {
    const { setSession, user } = useAuthStore();
    const { pullFromCloud, pushToCloud } = useContentStore();

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setSession(session);
            } else {
                // Anonymous sign-in for guest users
                supabase.auth.signInAnonymously().then(({ data: { session } }) => {
                    setSession(session);
                });
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, [setSession]);

    // Handle Cloud Sync
    useEffect(() => {
        if (user) {
            pushToCloud(user.id).then(() => {
                pullFromCloud(user.id);
            });
        }
    }, [user, pushToCloud, pullFromCloud]);

    return (
        <>
            {children}
        </>
    );
}

