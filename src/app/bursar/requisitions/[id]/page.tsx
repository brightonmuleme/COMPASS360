"use client";
import React, { useMemo } from 'react';
import { useSchoolData } from '@/lib/store';
import { useParams, useRouter } from 'next/navigation';
import RequisitionDetailView from '@/components/bursar/RequisitionDetailView';

export default function RequisitionDetailPage() {
    const { requisitions, updateRequisition } = useSchoolData();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const requisition = useMemo(() => {
        return requisitions.find(r => r.id === id);
    }, [requisitions, id]);

    const handleBack = () => {
        router.push('/bursar/requisitions');
    };

    if (!requisition) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-slate-200">
                    <h1 className="text-2xl font-black mb-4 uppercase text-slate-900 tracking-tighter">Document Not Found</h1>
                    <button
                        onClick={handleBack}
                        className="text-purple-600 font-black uppercase text-xs tracking-widest underline decoration-2 underline-offset-4"
                    >
                        Back to Requisitions
                    </button>
                </div>
            </div>
        );
    }

    return (
        <RequisitionDetailView
            requisition={requisition}
            onApprove={() => {}} // Not an approval role here, just viewing/printing
            isReadOnly={true}
            onBack={handleBack}
        />
    );
}
