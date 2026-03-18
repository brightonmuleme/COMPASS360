import { supabase } from '@/lib/supabase';

export interface PlatformStats {
    totalStudents: number;
    totalTutors: number;
    totalSchools: number;
    totalContent: number;
}

export const developerService = {
    // Get real counts from the database tables
    getRealtimeStats: async (): Promise<PlatformStats> => {
        try {
            const [
                { count: students },
                { count: tutors },
                { count: schools },
                { count: content }
            ] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'Student'),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'Tutor'),
                supabase.from('schools').select('*', { count: 'exact', head: true }),
                supabase.from('tutor_content').select('*', { count: 'exact', head: true })
            ]);

            return {
                totalStudents: students || 0,
                totalTutors: tutors || 0,
                totalSchools: schools || 0,
                totalContent: content || 0
            };
        } catch (error) {
            console.error("Error fetching platform stats:", error);
            return { totalStudents: 0, totalTutors: 0, totalSchools: 0, totalContent: 0 };
        }
    },

    // Fetch all users with profile data
    getAllUsers: async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*'); // Removed strict order to prevent fetch crash if cloud schema is partial

        if (error) throw error;
        return data;
    },

    // Global Platform Toggle (Maintenance, Registration, etc.)
    getGlobalSettings: async () => {
        const { data, error } = await supabase
            .from('platform_settings')
            .select('*')
            .single();

        if (error) return null;
        return data;
    },

    // --- PLATFORM CONTENT (Landing Page, Wallpapers, Schools) ---

    getLandingPageConfig: async () => {
        const { data, error } = await supabase
            .from('platform_settings')
            .select('landing_content, wallpapers, featured_schools')
            .eq('id', 1)
            .single();

        if (error) return null;
        return data;
    },

    saveLandingPageConfig: async (config: { landing_content?: any, wallpapers?: any, featured_schools?: any }) => {
        const { error } = await supabase
            .from('platform_settings')
            .upsert({ id: 1, ...config });

        if (error) {
            console.error("Supabase Save Error:", error);
            throw error;
        }
        return true;
    },

    updateGlobalSettings: async (settings: any) => {
        const { error } = await supabase
            .from('platform_settings')
            .upsert({ id: 1, ...settings });

        if (error) throw error;
        return true;
    },

    updateUserProfile: async (userId: string, updates: any) => {
        // Enforce Dual-Table Consistency
        const [profResult, ledgerResult] = await Promise.all([
            supabase.from('profiles').update(updates).eq('id', userId),
            supabase.from('financial_ledger').update(updates).eq('id', userId)
        ]);

        if (profResult.error) throw profResult.error;
        // Note: We don't throw on ledger error because some users (admins/legacy) 
        // might not exist in the ledger yet.
        return true;
    }
};
