import { supabase } from '@/lib/supabase';

export const storageService = {
    /**
     * Uploads a file to a secure Supabase bucket
     * @param bucket 'school_assets'
     * @param path e.g. 'tutors/vids/lesson1.mp4'
     * @param file The file object
     */
    uploadFile: async (bucket: string, path: string, file: File) => {
        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) throw error;

            // Get the URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(data.path);

            return { success: true, url: publicUrl, path: data.path };
        } catch (error: any) {
            console.error("Upload failed", error);
            return { success: false, error: error.message };
        }
    },

    deleteFile: async (bucket: string, path: string) => {
        const { error } = await supabase.storage.from(bucket).remove([path]);
        return { success: !error, error };
    }
};
