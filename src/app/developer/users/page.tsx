"use client";
import React, { useEffect, useState } from 'react';
import { developerService } from '@/services/developerService';
import {
    Users,
    Search,
    Filter,
    MoreVertical,
    Mail,
    Phone,
    Calendar,
    BadgeCheck,
    Loader2
} from 'lucide-react';

export default function UserManagerPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await developerService.getAllUsers();
                setUsers(data || []);
            } catch (error) {
                console.error("Failed to fetch users", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'All' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>User Manager</h1>
                    <p style={{ color: '#64748b' }}>Manage all accounts across the platform.</p>
                </div>
                <button style={{
                    padding: '0.75rem 1.5rem',
                    background: '#3b82f6',
                    color: 'white',
                    borderRadius: '12px',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                }}>
                    + Create System Account
                </button>
            </div>

            {/* Filters */}
            <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: '16px',
                marginBottom: '1.5rem',
                display: 'flex',
                gap: '1rem',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                border: '1px solid #f1f5f9'
            }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem 1rem 0.75rem 2.5rem',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            outline: 'none'
                        }}
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        color: '#64748b',
                        outline: 'none'
                    }}
                >
                    <option value="All">All Roles</option>
                    <option value="Student">Students</option>
                    <option value="Tutor">Tutors</option>
                    <option value="Bursar">Bursars</option>
                    <option value="Director">Directors</option>
                    <option value="Developer">Developers</option>
                </select>
            </div>

            {/* User List */}
            <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', border: '1px solid #f1f5f9' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc' }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '1.25rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>USER</th>
                            <th style={{ textAlign: 'left', padding: '1.25rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>ROLE</th>
                            <th style={{ textAlign: 'left', padding: '1.25rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>CONTACT</th>
                            <th style={{ textAlign: 'left', padding: '1.25rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>JOINED</th>
                            <th style={{ textAlign: 'center', padding: '1.25rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '4rem' }}>
                                    <Loader2 className="animate-spin" style={{ margin: '0 auto', color: '#3b82f6' }} size={40} />
                                    <p style={{ marginTop: '1rem', color: '#64748b' }}>Accessing Real-time User Data...</p>
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                                    No users found matching your search.
                                </td>
                            </tr>
                        ) : filteredUsers.map((user) => (
                            <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#3b82f615', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                            {user.name?.[0] || '?'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{user.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {user.id.slice(0, 8)}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <span style={{
                                        padding: '0.35rem 0.75rem',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        background: user.role === 'Student' ? '#3b82f615' : (user.role === 'Developer' ? '#10b98115' : '#f59e0b15'),
                                        color: user.role === 'Student' ? '#3b82f6' : (user.role === 'Developer' ? '#10b981' : '#f59e0b')
                                    }}>
                                        {user.role}
                                    </span>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.85rem' }}>
                                            <Mail size={14} /> {user.email}
                                        </div>
                                        {user.phone && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.85rem' }}>
                                                <Phone size={14} /> {user.phone}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem', color: '#64748b', fontSize: '0.85rem' }}>
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '1.25rem', textAlign: 'center' }}>
                                    <button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                        <MoreVertical size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
