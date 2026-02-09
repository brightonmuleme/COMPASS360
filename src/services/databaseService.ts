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
    }
};
