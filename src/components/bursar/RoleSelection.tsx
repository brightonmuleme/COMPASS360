"use client";

import { useSchoolData, AccountantRole } from "@/lib/store";
import styles from "./RoleSelection.module.css";

export default function RoleSelection() {
    const { setActiveRole } = useSchoolData();

    const roles: { id: AccountantRole, title: string, description: string, icon: string, color: string }[] = [
        {
            id: 'Bursar',
            title: 'Bursar Portal',
            description: 'Manage fees, payments, student balances, and admissions.',
            icon: '💰',
            color: '#2563eb' // blue-600
        },
        {
            id: 'Expense Manager',
            title: 'Expense Manager',
            description: 'Handle requisitions, track expenses, and manage budgets.',
            icon: '📉',
            color: '#dc2626' // red-600
        },
        {
            id: 'Estate Manager',
            title: 'Estate Manager',
            description: 'Track inventory, assets, and general school maintenance settings.',
            icon: '🏢',
            color: '#16a34a' // green-600
        }
    ];

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>Accountant Portal</h1>
                <p className={styles.subtitle}>Select your role to access the system</p>

                <div className={styles.grid}>
                    {roles.map((role) => (
                        <button
                            key={role.id}
                            className={styles.card}
                            onClick={() => setActiveRole(role.id)}
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
