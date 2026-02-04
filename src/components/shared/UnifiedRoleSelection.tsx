"use client";
import React from "react";

import { useSchoolData, AccountantRole } from "@/lib/store";
import { useRouter } from "next/navigation";
import styles from "../bursar/RoleSelection.module.css"; // Reuse existing styles

export default function UnifiedRoleSelection() {
    const { setActiveRole, setActiveAccountId, staffAccounts } = useSchoolData();
    const router = useRouter();

    // Clear any active role on mount so we start fresh
    // effective "logout" when landing here
    React.useEffect(() => {
        setActiveRole(null);
        setActiveAccountId(null);
    }, [setActiveRole, setActiveAccountId]);

    const roles: {
        id: AccountantRole,
        title: string,
        description: string,
        icon: string,
        color: string,
        path: string
    }[] = [
            // --- ADMIN ROLES ---
            {
                id: 'Registrar',
                title: 'Registrar',
                description: 'Manage admissions, enrollments, and student academic records.',
                icon: '📋',
                color: '#8b5cf6', // violet-600
                path: '/admin/enrollment' // Update to Enrollment Audit page
            },
            {
                id: 'School News Coordinator',
                title: 'News Coordinator',
                description: 'Post and manage school announcements and news updates.',
                icon: '📰',
                color: '#f59e0b', // amber-500
                path: '/admin/news'
            },
            {
                id: 'Director',
                title: 'School Director',
                description: 'Executive oversight, financial reports, and global monitoring.',
                icon: '👔',
                color: '#0f172a', // slate-900
                path: '/bursar' // Director Hub (Bypasses /admin loops)
            },
            // --- BURSAR ROLES ---
            {
                id: 'Bursar',
                title: 'Bursar',
                description: 'Manage fees, payments, student balances, and admissions.',
                icon: '💰',
                color: '#2563eb', // blue-600
                path: '/bursar'
            },
            {
                id: 'Expense Manager',
                title: 'Expense Manager',
                description: 'Handle requisitions, track expenses, and manage budgets.',
                icon: '📉',
                color: '#dc2626', // red-600
                path: '/bursar/expenses' // Specific Expense Dashboard
            },
            {
                id: 'Estate Manager',
                title: 'Estate Manager',
                description: 'Track inventory, assets, and general school maintenance settings.',
                icon: '🏢',
                color: '#16a34a', // green-600
                path: '/bursar/estate-settings' // Specific Estate Dashboard
            }
        ];

    const handleRoleSelect = (role: typeof roles[0]) => {
        // 1. Update React State (This is primary)
        setActiveRole(role.id);

        // 2. Find matching account if it exists
        const account = staffAccounts.find(acc => acc.role === role.id);
        if (account) {
            setActiveAccountId(account.id);
        } else {
            // fallback for roles without a specific staff record yet
            setActiveAccountId(`temp_${role.id}`);
        }

        // 3. Navigation
        // We use router.push for SPA navigation, but we could use window.location if 
        // we suspect a deeper state synchronization issue across layouts.
        // For now, let's stick with router.push but ensure it's the last action.
        router.push(role.path);
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>School Staff Portal</h1>
                <p className={styles.subtitle}>Select your role to access the system</p>

                <div className={styles.grid}>
                    {roles.map((role) => (
                        <button
                            key={role.id}
                            className={styles.card}
                            onClick={() => handleRoleSelect(role)}
                            style={{ borderTopColor: role.color }}
                        >
                            <div className={styles.iconWrapper} style={{ backgroundColor: `${role.color}15` }}>
                                <span className={styles.icon}>{role.icon}</span>
                            </div>
                            <h3 className={styles.roleTitle}>{role.title}</h3>
                            <p className={styles.roleDesc}>{role.description}</p>
                            <div className={styles.arrow}>Login &rarr;</div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
