"use client";
import React, { useMemo } from 'react';
import { useSchoolData } from '@/lib/store';
import { useParams, useRouter } from 'next/navigation';
import RequisitionDetailView from '@/components/bursar/RequisitionDetailView';

export default function RequisitionDetailPage() {
    const { requisitions, approveRequisition } = useSchoolData();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const requisition = useMemo(() => {
        return requisitions.find(r => r.id === id);
    }, [requisitions, id]);

    const handleApprove = (id: string) => {
        if (confirm("Are you sure you want to approve this requisition?")) {
            approveRequisition(id);
            // Optionally redirect back or stay on page
            router.push('/bursar/approvals/requisitions');
        }
    };

    if (!requisition) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-black mb-4 uppercase">Requisition Not Found</h1>
                    <button
                        onClick={() => router.push('/bursar/approvals/requisitions')}
                        className="text-blue-500 underline"
                    >
                        Back to Queue
                    </button>
                </div>
            </div>
        );
    }

    return (
        <RequisitionDetailView
            requisition={requisition}
            onApprove={handleApprove}
            isReadOnly={requisition.status === 'Approved'}
            onBack={() => router.push('/bursar/approvals/requisitions')}
        />
    );
}
