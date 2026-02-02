'use client';

import { ReactNode, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useContentStore } from '@/store/useContentStore';
import { Session, AuthChangeEvent, AuthResponse } from '@supabase/supabase-js';

export function Providers({ children }: { children: ReactNode }) {
    const { setSession, user } = useAuthStore();
    const { pullFromCloud, pushToCloud } = useContentStore();

    useEffect(() => {
        if (!supabase) {
            console.warn('Supabase client not initialized - checking environment variables');
            return;
        }

        // Initial session check
        supabase.auth.getSession().then((result: { data: { session: Session | null } }) => {
            const session = result.data?.session;
            if (session) {
                setSession(session);
            } else {
                // Anonymous sign-in for guest users
                supabase.auth.signInAnonymously().then((anonResult: AuthResponse) => {
                    const anonSession = anonResult.data?.session;
                    if (anonSession) setSession(anonSession as Session);
                });
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
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
