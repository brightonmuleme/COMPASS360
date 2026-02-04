import { useSchoolData } from '@/lib/store';
import { Clock, Search, ShieldAlert, History } from 'lucide-react';
import { useState, useMemo } from 'react';

export default function AuditLogsTab() {
    const { globalAuditLogs, schoolProfile } = useSchoolData();
    const [search, setSearch] = useState('');

    const filteredLogs = useMemo(() => {
        if (!search) return globalAuditLogs;
        const lower = search.toLowerCase();
        return globalAuditLogs.filter(log =>
            log.action.toLowerCase().includes(lower) ||
            log.details.toLowerCase().includes(lower) ||
            log.user.toLowerCase().includes(lower)
        );
    }, [globalAuditLogs, search]);

    const handleExportCSV = () => {
        if (filteredLogs.length === 0) return;
        const headers = ["Timestamp", "User", "Action", "Details"];
        const rows = filteredLogs.map(log => [
            new Date(log.timestamp).toLocaleString().replace(/,/g, ' '),
            log.user.replace(/,/g, ''),
            log.action.replace(/,/g, ''),
            log.details.replace(/,/g, ' ')
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShieldAlert className="text-blue-500" /> System Audit Trail
                    </h2>
                    <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Comprehensive log of administrative actions and financial corrections.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} size={16} />
                        <input
                            className="premium-input"
                            style={{ paddingLeft: '2.5rem' }}
                            placeholder="Search logs..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button onClick={handleExportCSV} className="premium-btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>
                        📄 Export CSV
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.8rem', opacity: 0.6 }}>TIMESTAMP</th>
                            <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.8rem', opacity: 0.6 }}>USER</th>
                            <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.8rem', opacity: 0.6 }}>ACTION</th>
                            <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.8rem', opacity: 0.6 }}>DETAILS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.map((log) => (
                            <tr key={log.id} style={{ borderTop: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} className="hover:bg-white/5">
                                <td style={{ padding: '1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Clock size={12} style={{ opacity: 0.4 }} />
                                        {new Date(log.timestamp).toLocaleString()}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                    <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                        {log.user}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 'bold' }}>{log.action}</td>
                                <td style={{ padding: '1rem', fontSize: '0.85rem', opacity: 0.8 }}>{log.details}</td>
                            </tr>
                        ))}
                        {filteredLogs.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ padding: '4rem', textAlign: 'center', opacity: 0.4 }}>
                                    <History size={48} style={{ margin: '0 auto 1rem', display: 'block' }} />
                                    No audit logs found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
