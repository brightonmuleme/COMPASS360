import { supabase } from '@/lib/supabase';

export interface LoginResponse {
    success: boolean;
    user?: any;
    error?: string;
}

export const authService = {
    // 1. LOGIN
    login: async (credentials: { username: string; password: string }): Promise<LoginResponse> => {
        try {
            // Supabase uses 'email' for login by default. We'll assume the username input is an email.
            const { data, error } = await supabase.auth.signInWithPassword({
                email: credentials.username,
                password: credentials.password,
            });

            if (error) throw error;
            return { success: true, user: data.user };

        } catch (error: any) {
            console.error("Login failed", error);
            if (error.message.includes("Invalid login credentials")) return { success: false, error: 'Incorrect email or password.' };
            return { success: false, error: error.message || 'Unknown error' };
        }
    },

    // 2. SIGN UP (And Create Profile)
    signUp: async (params: { username: string; password: string; email: string; phoneNumber?: string; name: string; role: string }) => {
        try {
            // A. Create Auth User
            const { data, error } = await supabase.auth.signUp({
                email: params.email,
                password: params.password,
                options: {
                    data: {
                        full_name: params.name,
                        phone_number: params.phoneNumber,
                        role: params.role, // Metadata for easy access
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                // B. Create Public Profile (The "Real" User Record)
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: data.user.id,
                            full_name: params.name,
                            role: params.role,
                            // school_id will be null initially, can be updated later
                        }
                    ]);

                if (profileError) {
                    // Critical: If profile creation fails, we should probably warn or try again.
                    // For now, let's just log it.
                    console.error("Profile creation failed!", profileError);
                }
            }

            return { success: true, userId: data.user?.id };

        } catch (error: any) {
            console.error("SignUp failed", error);
            return { success: false, error: error.message };
        }
    },

    // 3. LOGOUT
    logout: async () => {
        try {
            await supabase.auth.signOut();
            window.location.href = '/'; // Redirect to landing
        } catch (error) {
            console.error("Logout failed", error);
        }
    },

    // 4. GET CURRENT USER
    getCurrentUser: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        } catch (err) {
            return null;
        }
    },

    // 5. GET SESSION
    getSession: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            return session;
        } catch (err) {
            return null;
        }
    },

    // 6. GET USER ATTRIBUTES (Profile Data)
    getUserAttributes: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return {};

            // Fetch from Public Profile first (Source of Truth)
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile) {
                return {
                    name: profile.full_name,
                    role: profile.role,
                    email: user.email,
                    // Map other fields as needed
                    'custom:role': profile.role
                };
            }

            // Fallback to Metadata
            return {
                name: user.user_metadata?.full_name,
                role: user.user_metadata?.role,
                'custom:role': user.user_metadata?.role
            };
        } catch (error) {
            console.error("Error fetching attributes", error);
            return {};
        }
    },

    // --- PASSWORD RESET (Supabase) ---
    resetPassword: async (email: string) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/update-password`, // You'll need an update password page
            });
            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    // Unused in Supabase flow usually (handled by link), but keeping signature
    confirmSignUp: async (username: string, code: string) => {
        // Supabase handles verification via link click usually, but if you turned on OTP:
        try {
            const { error } = await supabase.auth.verifyOtp({
                email: username,
                token: code,
                type: 'signup'
            });
            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    // Placeholder
    confirmSignIn: async (challengeResponse: string) => { return { success: true } }

};
