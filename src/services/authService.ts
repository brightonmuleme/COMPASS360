import { supabase } from '@/lib/supabase';

interface AuthResponse {
    success: boolean;
    error?: string;
    userId?: string;
    user?: any;
    nextStep?: any;
    isSignUpComplete?: boolean;
    isSignedIn?: boolean;
    name?: string;
    role?: string;
    email?: string;
    'custom:role'?: string;
}

export const authService = {
    // 1. LOGIN
    login: async (credentials: { username: string; password: string }): Promise<AuthResponse> => {
        try {
            // Supabase uses 'email' for login by default.
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
    signUp: async (params: {
        username: string;
        password: string;
        email: string;
        phoneNumber?: string;
        name: string;
        role: string;
        payCode?: string;
        schoolId?: string;
    }): Promise<AuthResponse> => {
        try {
            // A. Create Auth User
            const { data, error } = await supabase.auth.signUp({
                email: params.email,
                password: params.password,
                options: {
                    data: {
                        full_name: params.name,
                        phone_number: params.phoneNumber,
                        role: params.role,
                        pay_code: params.payCode,
                        school_id: params.schoolId
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
                            // email column missing in DB schema, omitting to prevent failure
                            role: params.role,
                            school_id: params.schoolId,
                            pay_code: params.payCode
                        }
                    ]);

                if (profileError) {
                    console.error("Profile creation failed!", profileError);
                    return { success: false, error: "Cloud profile synchronization failed. Please contact support." };
                }
            }

            return { success: true, userId: data.user?.id };

        } catch (error: any) {
            console.error("SignUp failed", error);
            return { success: false, error: error.message };
        }
    },

    // 3. LOGOUT
    logout: async (): Promise<AuthResponse> => {
        try {
            await supabase.auth.signOut();
            window.location.href = '/'; // Redirect to landing
            return { success: true };
        } catch (error: any) {
            console.error("Logout failed", error);
            return { success: false, error: error.message || 'Unknown error' };
        }
    },

    // 4. GET CURRENT USER
    getCurrentUser: async (): Promise<AuthResponse> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            return { success: true, user: user };
        } catch (err: any) {
            return { success: false, error: err.message || 'Unknown error' };
        }
    },

    // 5. GET SESSION
    getSession: async (): Promise<AuthResponse> => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            return { success: true, nextStep: session }; // Using nextStep to hold session data
        } catch (err: any) {
            return { success: false, error: err.message || 'Unknown error' };
        }
    },

    // 6. GET USER ATTRIBUTES (Profile Data)
    getUserAttributes: async (): Promise<Record<string, any>> => {
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
                    'custom:role': profile.role
                };
            }

            // Fallback to Metadata
            return {
                name: user.user_metadata?.full_name,
                role: user.user_metadata?.role,
                'custom:role': user.user_metadata?.role
            };
        } catch (error: any) {
            console.error("Error fetching attributes", error);
            return {};
        }
    },

    // --- PASSWORD RESET (Supabase) ---
    resetPassword: async (email: string): Promise<AuthResponse> => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    confirmResetPassword: async (token: string, newPassword: string): Promise<AuthResponse> => {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    // Optional: If you want to confirm reset via OTP instead of link
    verifyResetOtp: async (email: string, token: string): Promise<AuthResponse> => {
        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'recovery'
            });
            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    // Unused in Supabase flow usually (handled by link), but keeping signature
    confirmSignUp: async (username: string, code: string): Promise<AuthResponse> => {
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
    confirmSignIn: async (challengeResponse: string): Promise<AuthResponse> => {
        // In some flows we might use this
        return { success: true, error: undefined }
    },

    // 7. UPDATE USER (Metadata & Security)
    updateUser: async (updates: { name?: string; phone?: string; password?: string }): Promise<AuthResponse> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No authenticated user found");

            const authUpdates: any = {};
            if (updates.password) authUpdates.password = updates.password;

            // Prepare metadata updates
            const newMetadata = { ...user.user_metadata };
            if (updates.name) newMetadata.full_name = updates.name;
            if (updates.phone) newMetadata.phone_number = updates.phone;

            if (Object.keys(newMetadata).length > 0) {
                authUpdates.data = newMetadata;
            }

            // A. Update Auth Metadata / Password
            const { error: authError } = await supabase.auth.updateUser(authUpdates);
            if (authError) throw authError;

            // B. Update Public Profile Table (if it exists)
            if (updates.name) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ full_name: updates.name })
                    .eq('id', user.id);

                if (profileError) console.error("Profile update sync failed (non-critical):", profileError);
            }

            return { success: true };
        } catch (error: any) {
            console.error("Update failed", error);
            return { success: false, error: error.message };
        }
    }
};
