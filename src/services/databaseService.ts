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

    // --- OFFICIAL LIBRARY (Developer Content) ---

    getOfficialLibrary: async () => {
        const { data, error } = await supabase
            .from('official_library')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.warn("official_library table might not exist yet, falling back to empty.");
            return [];
        }
        return data;
    },

    saveOfficialContent: async (content: any) => {
        const { data, error } = await supabase
            .from('official_library')
            .insert([content])
            .select();

        if (error) throw error;
        return data[0];
    },

    updateOfficialContent: async (id: string, content: any) => {
        const { data, error } = await supabase
            .from('official_library')
            .update(content)
            .eq('id', id)
            .select();

        if (error) throw error;
        return data[0];
    },

    deleteOfficialContent: async (id: string) => {
        const { error } = await supabase
            .from('official_library')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    saveOfficialProgramme: async (prog: any) => {
        const { data, error } = await supabase
            .from('programmes')
            .upsert([prog])
            .select();
        if (error) throw error;
        return data[0];
    },

    deleteOfficialProgramme: async (id: string) => {
        const { error } = await supabase
            .from('programmes')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    },

    saveOfficialCourseUnit: async (cu: any) => {
        const { data, error } = await supabase
            .from('course_units')
            .upsert([cu])
            .select();
        if (error) throw error;
        return data[0];
    },

    deleteOfficialCourseUnit: async (id: string) => {
        const { error } = await supabase
            .from('course_units')
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

    saveSchoolCloudState: async (schoolId: string, state: any, forceActiveRole?: string) => {
        // 🛡️ SYNC BRIDGE: RE-ENABLED AT USER'S REQUEST
        // This allows local development rosters to be pushed to the Cloud Sync engine,
        // which is required to test the Student Account Linking feature locally.
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

    // --- TIME MACHINE: institutional Snapshots ---
    getSchoolSnapshots: async (schoolId: string) => {
        const { data, error } = await supabase
            .from('school_snapshots')
            .select('id, school_id, label, created_at')
            .eq('school_id', schoolId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('🕵️ Snapshot Fetch Error:', error);
            return [];
        }
        return data;
    },

    getSchoolSnapshotDetail: async (snapshotId: string) => {
        const { data, error } = await supabase
            .from('school_snapshots')
            .select('state')
            .eq('id', snapshotId)
            .single();

        if (error) {
            console.error('🕵️ Snapshot Detail Error:', error);
            return null;
        }
        return data?.state;
    },

    createSchoolSnapshot: async (schoolId: string, label: string, state: any) => {
        const { data, error } = await supabase
            .from('school_snapshots')
            .insert([{
                school_id: schoolId,
                label: label,
                state: state,
                created_at: new Date().toISOString()
            }])
            .select();

        if (error) {
            console.error('🕵️ Snapshot Creation Error:', error);
            throw error;
        }
        return data[0];
    },

    // --- CLOUD STORAGE (TikTok/YouTube Engine) ---

    uploadFile: async (bucket: string, path: string, file: File) => {
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw error;
        return data;
    },

    getFileUrl: (bucket: string, path: string) => {
        const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        return data.publicUrl;
    },

    deleteFile: async (bucket: string, path: string) => {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([path]);
        if (error) throw error;
        return true;
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
    },

    getAdmissionApplications: async () => {
        const { data, error } = await supabase
            .from('admission_applications')
            .select('*')
            .order('submitted_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    submitAdmissionApplication: async (appData: any) => {
        const { data, error } = await supabase
            .from('admission_applications')
            .insert([appData])
            .select();
        if (error) throw error;
        return data[0];
    }
};
