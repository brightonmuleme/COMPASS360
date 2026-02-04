"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useSchoolData, formatMoney, BankAccount } from '@/lib/store';

export default function AccountsPage() {
    const {
        accounts, addAccount, updateAccount, deleteAccount,
        accountGroups, addAccountGroup, deleteAccountGroup,
        generalTransactions
    } = useSchoolData();

    const [isEditingMode, setIsEditingMode] = useState(false);

    // Account Modal State
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [isAddingAccount, setIsAddingAccount] = useState(false);

    // Group Modal State
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");

    const [formData, setFormData] = useState<Partial<BankAccount>>({
        name: '',
        group: 'Cash',
        currency: 'USh',
        balance: 0
    });

    // --- ACCOUNT ACTIONS ---
    const openAddAccountModal = () => {
        setFormData({
            name: '',
            group: (accountGroups[0] || 'Cash') as any, // Cast to any to avoid strict string vs union issue
            currency: 'USh',
            balance: 0,
            type: 'Asset'
        });
        setIsAddingAccount(true);
    };

    const openEditAccountModal = (account: BankAccount) => {
        setEditingAccount(account);
        setFormData({ ...account });
    };

    const handleSaveAccount = () => {
        // Determine Type automatically based on Group logic if needed, 
        // or let user override (though we hiding type selector, defaulting to Asset/Liability via strings)
        let type: 'Asset' | 'Liability' = 'Asset';
        // Simple heuristic: 'Card', 'Liability', 'Debt' keywords -> Liability
        if (['Card', 'Loan', 'Debt', 'Liability'].some(k => formData.group?.includes(k))) type = 'Liability';

        const accountData = {
            ...formData,
            type: type
        } as BankAccount;

        if (editingAccount) {
            updateAccount({ ...accountData, id: editingAccount.id });
            setEditingAccount(null);
        } else {
            addAccount(accountData);
            setIsAddingAccount(false);
        }
    };

    const handleDeleteAccount = () => {
        if (editingAccount) {
            // Check for existing transactions
            const hasTransactions = generalTransactions.some(t => t.method === editingAccount.name);
            if (hasTransactions) {
                alert(`Cannot delete account "${editingAccount.name}" because it has associated transactions. Please archive it or delete the transactions first.`);
                return;
            }

            if (confirm(`Are you sure you want to delete "${editingAccount.name}"?`)) {
                deleteAccount(editingAccount.id);
                setEditingAccount(null);
            }
        }
    };

    // --- GROUP ACTIONS ---
    const handleAddGroup = () => {
        if (newGroupName.trim()) {
            addAccountGroup(newGroupName.trim());
            setNewGroupName("");
            setIsAddingGroup(false);
        }
    };

    // Calculate totals dynamically
    // Helper to get current balance for an account: Opening Balance + (Income - Expense)
    const getAccountBalance = (account: BankAccount) => {
        const opening = Number(account.balance) || 0;
        // Find transactions where method matches account name
        // Note: 'method' field in GeneralTransaction holds the Account Name
        const txs = generalTransactions.filter(t => t.method === account.name);
        const income = txs.filter(t => t.type === 'Income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const expense = txs.filter(t => t.type === 'Expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);

        // For Liabilities (e.g. Credit Card), Expenses INCREASE the debt, Income (Payments) DECREASE it.
        // However, usually Liability accounts are tracked as negative or positive debt.
        // User's code treats Liability total as distinct. 
        // Let's stick to standard: Asset = Opening + Inc - Exp. 
        // Liability = Opening (Debt) + Exp (Spend) - Inc (Repayment).
        // BUT, looking at the previous logic, liabilitiesTotal was just sum of balances.
        // Let's assume 'balance' is always 'Amount of Money we have' (Asset) or 'Amount we owe' (Liability).

        if (account.type === 'Liability') {
            // If I have a credit card, spending increases the balance (debt). Paying it off decreases it.
            // Assume 'balance' is positive debt number.
            return opening + expense - income;
        } else {
            // Asset: Cash
            return opening + income - expense;
        }
    };

    const assetsTotal = accounts.filter(a => a.type === 'Asset').reduce((sum, a) => sum + getAccountBalance(a), 0);
    const liabilitiesTotal = accounts.filter(a => a.type === 'Liability').reduce((sum, a) => sum + getAccountBalance(a), 0);
    const netTotal = assetsTotal - liabilitiesTotal;

    // Grouping logic (Use accountGroups from store to dictate order and existence)
    // We also include any 'orphan' groups found in accounts just in case
    const allUsedGroups = Array.from(new Set([...accountGroups, ...accounts.map(a => a.group)]));

    const groupedAccounts = allUsedGroups.reduce((acc, group) => {
        acc[group] = accounts.filter(a => a.group === group);
        return acc;
    }, {} as Record<string, BankAccount[]>);

    return (
        <div className="h-full w-full bg-slate-50 flex flex-col font-sans text-slate-800">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 shadow-sm flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <Link href="/bursar/settings" className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </Link>
                    <h1 className="text-xl font-bold text-slate-800">Accounts</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsEditingMode(!isEditingMode)}
                        className={`p-2 rounded-full transition-colors ${isEditingMode ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
                        title="Edit Mode"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={openAddAccountModal} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors" title="Add Account">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    </button>
                </div>
            </div>

            {/* Summary Row */}
            <div className="bg-white border-b border-slate-200 grid grid-cols-3 divide-x divide-slate-100">
                <div className="p-4 text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Assets</div>
                    <div className="text-sm font-bold text-blue-500">{formatMoney(assetsTotal).replace('UGX ', 'USh ')}</div>
                </div>
                <div className="p-4 text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Liabilities</div>
                    <div className="text-sm font-bold text-slate-800">{formatMoney(liabilitiesTotal).replace('UGX ', 'USh ')}</div>
                </div>
                <div className="p-4 text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total</div>
                    <div className="text-sm font-bold text-slate-800">{formatMoney(netTotal).replace('UGX ', 'USh ')}</div>
                </div>
            </div>

            {/* Account List */}
            <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full space-y-4 pb-20">
                {allUsedGroups.map(group => {
                    // Show group even if empty so users can see newly created groups
                    const groupItems = groupedAccounts[group] || [];
                    const groupTotal = groupItems.reduce((s, a) => s + getAccountBalance(a), 0);

                    if (groupItems.length === 0 && !isEditingMode) {
                        // Might want to hide empty groups if not editing to keep clean? 
                        // But user tasked "add new account groups", so they expect to see it.
                        // Let's show it if it's in the list.
                    }

                    return (
                        <div key={group} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group/section">
                            <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{group}</div>
                                {isEditingMode && (
                                    <button onClick={() => deleteAccountGroup(group)} className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover/section:opacity-100 transition-opacity">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                            </div>
                            <div className="divide-y divide-slate-100">
                                {groupItems.map(account => (
                                    <div
                                        key={account.id}
                                        className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors group cursor-pointer"
                                        onClick={() => {
                                            if (isEditingMode) openEditAccountModal(account);
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isEditingMode && (
                                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                            )}
                                            <div className="font-semibold text-slate-700">{account.name}</div>
                                        </div>
                                        <div className={`font-bold font-mono text-sm ${account.type === 'Liability' ? 'text-red-500' : 'text-blue-600'}`}>
                                            <span className="text-xs text-slate-400 font-normal mr-1">{account.currency}</span>
                                            {getAccountBalance(account).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                ))}
                                {groupItems.length === 0 && (
                                    <div className="p-4 text-center text-xs text-slate-400 italic">No accounts in this group</div>
                                )}
                            </div>
                            <div className="bg-slate-50/30 px-4 py-2 text-right text-xs font-semibold text-slate-400">
                                Total: <span className="text-slate-600 ml-1">USh {groupTotal.toLocaleString()}</span>
                            </div>
                        </div>
                    );
                })}


                {/* Add Group Trigger */}
                <div className="text-center py-8">
                    <button onClick={() => setIsAddingGroup(true)} className="text-sm text-blue-500 font-bold hover:underline">
                        + Add New Account Group
                    </button>
                </div>
            </div>

            {/* ADD ACCOUNT GROUP MODAL */}
            {isAddingGroup && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-scale-up border border-slate-100 p-6">
                        <h3 className="font-bold text-lg text-slate-800 mb-4">Add Account Group</h3>
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                            placeholder="Group Name (e.g. Mobile Money)"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setIsAddingGroup(false)} className="flex-1 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
                            <button onClick={handleAddGroup} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Add Group</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD / EDIT ACCOUNT MODAL */}
            {(isAddingAccount || editingAccount) && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-scale-up border border-slate-100">
                        {/* Modal Header */}
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">{editingAccount ? 'Edit Account' : 'Add Account'}</h3>
                            <button onClick={() => { setIsAddingAccount(false); setEditingAccount(null); }} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Account Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-700"
                                    placeholder="e.g. Centenary Bank"
                                    autoFocus
                                />
                            </div>

                            {/* Group Selection */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Account Group</label>
                                <select
                                    value={formData.group}
                                    onChange={e => setFormData({ ...formData, group: e.target.value as any })}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-600 bg-white cursor-pointer"
                                >
                                    {accountGroups.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Balance */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Opening Balance</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 text-sm font-bold">USh</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={formData.balance}
                                        onChange={e => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                                        className="w-full border border-slate-300 rounded-lg pl-12 pr-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-slate-700"
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Liabilities (e.g. Cards) should use positive values here, effectively debt.
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 bg-slate-50">
                            {editingAccount && (
                                <button
                                    onClick={handleDeleteAccount}
                                    className="text-red-500 hover:text-red-700 font-bold text-sm px-4 py-2 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    Delete
                                </button>
                            )}
                            <div className="flex-1"></div>
                            <button
                                onClick={() => { setIsAddingAccount(false); setEditingAccount(null); }}
                                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-lg transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAccount}
                                disabled={!formData.name}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editingAccount ? 'Save Changes' : 'Create Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
