import { signOut, signIn, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { api } from '@/lib/api'; // We might not need this for auth anymore if using Amplify direct, but good for custom calls

export interface LoginResponse {
    success: boolean;
    user?: any;
    error?: string;
}

export const authService = {
    login: async (credentials: { username: string; password: string }): Promise<LoginResponse> => {
        try {
            const { isSignedIn, nextStep } = await signIn({
                username: credentials.username,
                password: credentials.password
            });

            if (isSignedIn) {
                return { success: true };
            } else if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
                return { success: false, error: 'User must change password. Please use a different interface for first-time login or update code to handle password reset.' };
            } else {
                return { success: false, error: `Login flow requires next step: ${nextStep.signInStep}` };
            }
        } catch (error: any) {
            console.error("Login failed", error);
            // Return clearer error messages
            if (error.name === 'NotAuthorizedException') return { success: false, error: 'Incorrect username or password.' };
            if (error.name === 'UserNotFoundException') return { success: false, error: 'User does not exist.' };
            return { success: false, error: error.message || 'Unknown error' };
        }
    },

    logout: async () => {
        try {
            await signOut();
            window.location.href = '/login';
        } catch (error) {
            console.error("Logout failed", error);
        }
    },

    getCurrentUser: async () => {
        try {
            return await getCurrentUser();
        } catch (err) {
            return null;
        }
    },

    getSession: async () => {
        try {
            const session = await fetchAuthSession();
            return session;
        } catch (err) {
            return null;
        }
    },

    getToken: async (): Promise<string | undefined> => {
        try {
            const session = await fetchAuthSession();
            return session.tokens?.idToken?.toString();
        } catch (err) {
            return undefined;
        }
    }
};
