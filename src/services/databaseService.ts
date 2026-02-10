import { supabase } from '@/lib/supabase';

export const databaseService = {
    // --- TRANSACTIONS & FEES ---

    getStudentTransactions: async (studentId: string) => {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    getStudentBalance: async (studentId: string) => {
        const { data, error } = await supabase
            .from('students')
            .select('balance_ugx')
            .eq('id', studentId)
            .single();

        if (error) throw error;
        return data?.balance_ugx || 0;
    },

    // --- CONTENT ---

    getTutorContents: async (schoolId?: string) => {
        let query = supabase.from('tutor_contents').select('*');
        if (schoolId) query = query.eq('school_id', schoolId);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    saveTutorContent: async (content: any) => {
        const { data, error } = await supabase
            .from('tutor_contents')
            .insert([content])
            .select();

        if (error) throw error;
        return data[0];
    },

    submitSchoolApplication: async (application: any) => {
        const { data, error } = await supabase
            .from('school_applications')
            .insert([{
                school_name: application.schoolName,
                admin_name: application.adminName,
                email: application.email,
                phone: application.phone,
                status: 'Pending'
            }])
            .select();

        if (error) throw error;
        return data[0];
    },

    // --- CLOUD STATE SYNC (For Cross-Device Consistency) ---

    getSchoolCloudState: async (schoolId: string) => {
        const { data, error } = await supabase
            .from('schools')
            .select('settings')
            .eq('id', schoolId)
            .single();

        if (error || !data?.settings) return null;
        // The cloud state is stored within the 'settings' JSON field
        const settings = typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings;
        return settings.cloud_state || null;
    },

    saveSchoolCloudState: async (schoolId: string, state: any) => {
        // First get current settings to avoid overwriting other keys
        const { data: school } = await supabase
            .from('schools')
            .select('settings')
            .eq('id', schoolId)
            .single();

        const currentSettings = school?.settings
            ? (typeof school.settings === 'string' ? JSON.parse(school.settings) : school.settings)
            : {};

        const updatedSettings = {
            ...currentSettings,
            cloud_state: state
        };

        const { error } = await supabase
            .from('schools')
            .update({ settings: updatedSettings })
            .eq('id', schoolId);

        if (error) throw error;
        return true;
    }
};
