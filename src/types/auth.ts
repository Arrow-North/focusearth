import type { Session, User } from '@supabase/supabase-js';
import type { Profile, UserType } from './database';

export type { Session as AuthSession };
export type AuthUser = User;

export interface UserProfile extends Profile {
  company?: {
    id: number;
    name: string;
    type: string;
  } | null;
}

export type UserRole = UserType;
