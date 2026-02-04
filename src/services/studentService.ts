import { api } from '@/lib/api';
import { EnrolledStudent } from '@/lib/store';

export const studentService = {
    getAll: async (): Promise<EnrolledStudent[]> => {
        return api.get<EnrolledStudent[]>('/students');
    },

    getById: async (id: number | string): Promise<EnrolledStudent> => {
        return api.get<EnrolledStudent>(`/students/${id}`);
    },

    create: async (student: Partial<EnrolledStudent>): Promise<EnrolledStudent> => {
        return api.post<EnrolledStudent>('/students', student);
    },

    update: async (id: number | string, updates: Partial<EnrolledStudent>): Promise<EnrolledStudent> => {
        return api.patch<EnrolledStudent>(`/students/${id}`, updates);
    },

    delete: async (id: number | string): Promise<void> => {
        return api.delete(`/students/${id}`);
    },

    // Extended Actions
    promote: async (ids: number[], targetSemester: string): Promise<any> => {
        return api.post('/students/promote', { ids, targetSemester });
    }
};
