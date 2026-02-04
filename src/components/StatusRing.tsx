"use client";
import React from 'react';
import { EnrolledStudent, useSchoolData, determineStudentStatus, calculateClearancePercentage } from '@/lib/store';

export const StatusRing = ({ student, size = 60 }: { student: EnrolledStudent, size?: number }) => {
    const { financialSettings, students, billings, payments, bursaries } = useSchoolData();

    // Bug Fix: Real-Time Financial Mirroring (Pay Code Sync)
    // Pass all students to enable automatic Pay Code lookup in the calculation
    const percentage = calculateClearancePercentage(
        student,
        billings,
        payments,
        bursaries,
        undefined,
        undefined,
        students // Enable Pay Code mirroring
    );

    // Determine if this calculation is mirrored from Bursar
    const isMirrored = student.origin === 'registrar' && student.payCode;
    const bursarRecord = isMirrored
        ? students.find(s => s.origin === 'bursar' && s.payCode === student.payCode)
        : null;

    // Proportional styling
    const strokeWidth = Math.min(Math.max(3, size * 0.08), 8);
    const radius = (size / 2) - (strokeWidth / 2);
    const circumference = 2 * Math.PI * radius;

    const visualPercentage = Math.min(100, percentage);
    const offset = circumference - (visualPercentage / 100) * circumference;

    // Derive Color from Percentage (IDENTICAL thresholds to Bursar portal)
    const probationThreshold = financialSettings?.probationPct ?? 80;
    let color = '#ef4444'; // Red: Below threshold
    if (percentage >= 100) color = '#10b981'; // Green: Cleared
    else if (percentage >= probationThreshold) color = '#8b5cf6'; // Purple: Probation

    // Gray if Registrar student has no Bursar financial record
    if (isMirrored && !bursarRecord) {
        color = '#9ca3af';
    }

    const status = bursarRecord ? determineStudentStatus(bursarRecord, financialSettings) : determineStudentStatus(student, financialSettings);

    // Enhanced tooltip with sync information
    const tooltip = isMirrored
        ? (bursarRecord
            ? `Financial Data: Synced via Bursar (Code: ${student.payCode})\nBalance: ${bursarRecord.balance?.toLocaleString() || 0}, Status: ${status}`
            : `Financial Data: Not setup in Bursar portal\nPay Code: ${student.payCode}`)
        : `Bal: ${student.balance?.toLocaleString() || 0}, Total: ${student.totalFees?.toLocaleString() || 0}, Status: ${status}`;

    return (
        <div
            title={tooltip}
            style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Track */}
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-slate-200/10 dark:text-white/5" strokeWidth={strokeWidth} />
                {/* Progress Circle */}
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
            </svg>
            <div style={{ position: 'absolute', fontSize: `${Math.round(size * 0.25)}px`, fontWeight: '800', color: color, transform: 'rotate(0deg)' }}>
                {percentage.toFixed(1)}%
            </div>
        </div>
    );
};
