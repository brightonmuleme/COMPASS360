import { useSchoolData } from '@/lib/store';
import { Clock, Search, ShieldAlert, History } from 'lucide-react';
import { useState, useMemo } from 'react';

export default function AuditLogsTab() {
    const { globalAuditLogs, schoolProfile } = useSchoolData();
    const [search, setSearch] = useState('');

    const filteredLogs = useMemo(() => {
        const schoolLogs = globalAuditLogs.filter(log => !log.scope || log.scope === 'school');
        if (!search) return schoolLogs;
        const lower = search.toLowerCase();
        return schoolLogs.filter(log =>
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
        <div className="animate-fade-in px-1 md:px-0">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                        <ShieldAlert className="text-blue-500 w-5 h-5 md:w-6 md:h-6" /> System Audit Trail
                    </h2>
                    <p className="opacity-60 text-xs md:text-sm mt-1">Comprehensive log of administrative actions and financial corrections.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative w-full sm:w-[250px] lg:w-[350px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={16} />
                        <input
                            className="premium-input !pl-10 !w-full"
                            placeholder="Search logs..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button onClick={handleExportCSV} className="premium-btn btn-secondary !py-2.5 flex items-center justify-center gap-2">
                        <span>📄</span> Export CSV
                    </button>
                </div>
            </div>

            <div className="card !p-0 overflow-hidden border border-white/5 bg-slate-900/40 backdrop-blur-md">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full border-collapse min-w-[700px] md:min-w-full">
                        <thead className="bg-white/[0.03]">
                            <tr>
                                <th className="text-left p-4 text-[10px] md:text-xs font-black uppercase tracking-widest opacity-60">TIMESTAMP</th>
                                <th className="text-left p-4 text-[10px] md:text-xs font-black uppercase tracking-widest opacity-60">USER</th>
                                <th className="text-left p-4 text-[10px] md:text-xs font-black uppercase tracking-widest opacity-60">ACTION</th>
                                <th className="text-left p-4 text-[10px] md:text-xs font-black uppercase tracking-widest opacity-60">DETAILS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="p-4 text-xs md:text-[0.85rem] whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Clock size={12} className="opacity-40" />
                                            {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs md:text-[0.85rem]">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            {log.user}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs md:text-[0.85rem] font-bold text-white/90 whitespace-nowrap">{log.action}</td>
                                    <td className="p-4 text-xs md:text-[0.85rem] text-slate-400 max-w-[300px] truncate md:max-w-none md:whitespace-normal">
                                        {log.details}
                                    </td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-16 text-center opacity-40">
                                        <History size={48} className="mx-auto mb-4" />
                                        <p className="text-sm font-medium">No audit logs found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
