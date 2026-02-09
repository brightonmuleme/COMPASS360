"use client";
import EnrollmentContent from "@/app/bursar/enrollment/page";
import { useSchoolData } from "@/lib/store";

export default function AdminEnrollmentPage() {
    const { activeRole } = useSchoolData();

    // Registrar's enrollment page is kept blank/placeholder for now
    if (activeRole === 'Registrar') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 font-sans">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-700">Enrollment Portal</h2>
                <p className="mt-2">Student records management interface is under development.</p>
            </div>
        );
    }

    return <EnrollmentContent />;
}
