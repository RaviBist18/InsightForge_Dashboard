"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type UserRole = 'admin' | 'user' | null;

interface UserProfile {
    role: UserRole;
    name: string;
    email: string;
    loading: boolean;
}

export function useUserRole(): UserProfile {
    const [profile, setProfile] = useState<UserProfile>({
        role: null,
        name: '',
        email: '',
        loading: true,
    });

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { setProfile({ role: null, name: '', email: '', loading: false }); return; }

                const { data } = await supabase
                    .from('profiles')
                    .select('role, full_name')
                    .eq('id', user.id)
                    .single();

                setProfile({
                    role: (data?.role as UserRole) || 'user',
                    name: data?.full_name || user.email || 'User',
                    email: user.email || '',
                    loading: false,
                });
            } catch {
                setProfile({ role: 'user', name: '', email: '', loading: false });
            }
        };
        fetchRole();
    }, []);

    return profile;
}