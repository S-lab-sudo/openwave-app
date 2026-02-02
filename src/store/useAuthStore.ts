import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    session: any | null;
    isLoading: boolean;
    guestId: string | null;
    setUser: (user: User | null) => void;
    setSession: (session: any | null) => void;
    setGuestId: (id: string) => void;
    signOut: () => Promise<void>;
}

const getStoredGuestId = () => {
    if (typeof window === 'undefined') return null;
    let id = localStorage.getItem('openwave_guest_id');
    if (!id) {
        id = 'ow_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('openwave_guest_id', id);
    }
    return id;
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    isLoading: true,
    guestId: getStoredGuestId(),
    setUser: (user) => set({ user, isLoading: false }),
    setSession: (session) => set({ session, user: session?.user ?? null, isLoading: false }),
    setGuestId: (id) => {
        localStorage.setItem('openwave_guest_id', id);
        set({ guestId: id });
    },
    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, isLoading: false });
    },
}));
