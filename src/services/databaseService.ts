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

    getTutorContents: async (tutorId?: string) => {
        let query = supabase.from('tutor_contents').select('*');
        if (tutorId) query = query.eq('tutor_id', tutorId);

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

    updateTutorContent: async (id: string, content: any) => {
        const { data, error } = await supabase
            .from('tutor_contents')
            .update(content)
            .eq('id', id)
            .select();

        if (error) throw error;
        return data[0];
    },

    deleteTutorContent: async (id: string) => {
        const { error } = await supabase
            .from('tutor_contents')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
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
        try {
            const response = await fetch(`/api/cloud/sync?schoolId=${schoolId}`);

            if (!response.ok) {
                console.error('☁️ Failed to fetch cloud state:', await response.text());
                return null;
            }

            const { cloudState } = await response.json();
            return cloudState;
        } catch (error) {
            console.error('☁️ Error fetching cloud state:', error);
            return null;
        }
    },

    saveSchoolCloudState: async (schoolId: string, state: any) => {
        // 🛡️ SAFETY BOUNDARY: LOCALHOST LOCK
        // This ensures Development/Localhost NEVER overwrites Production Data
        if (typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            console.warn("🛑 SAFETY BOUNDARY: Cloud Save Blocked on Localhost/Dev Environment.");
            return true;
        }


        try {
            console.log('☁️ CLOUD SAVE: Starting for school ID:', schoolId);

            const response = await fetch('/api/cloud/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    schoolId,
                    cloudState: state
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('☁️ CLOUD SAVE ERROR:', errorData);
                throw new Error(errorData.error || 'Failed to save cloud state');
            }

            const result = await response.json();
            console.log('☁️ CLOUD SAVE SUCCESS:', result);

            return true;
        } catch (error) {
            console.error('☁️ CLOUD SAVE CRITICAL ERROR:', error);
            throw error;
        }
    },

    applyInventoryTransaction: async (schoolId: string, itemId: string, delta: number, log: any) => {
        // 🛡️ SAFETY BOUNDARY: LOCALHOST LOCK
        if (typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            console.warn("🛑 SAFETY BOUNDARY: Cloud Transaction Blocked on Localhost.");
            return true;
        }

        try {
            const response = await fetch('/api/cloud/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schoolId, itemId, delta, log })
            });

            if (!response.ok) throw new Error('Transaction failed');
            return await response.json();
        } catch (error) {
            console.error('☁️ TRANSACTION ERROR:', error);
            throw error;
        }
    }
};
