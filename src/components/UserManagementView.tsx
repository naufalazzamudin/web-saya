import React, { useState, useEffect } from 'react';
import { Users, Key, Save, ArrowLeft, Loader2, CheckCircle, ShieldCheck, Edit3 } from 'lucide-react';
import type { UserAccount } from '../lib/types';
import { getUsersList, updateUserCredentials } from '../lib/api';

interface UserManagementViewProps {
  onBack: () => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
  isLoggedIn: boolean;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ onBack, onToast, isLoggedIn }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ username: string; password: string }>({ username: '', password: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getUsersList();
      setUsers(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleStartEdit = (user: UserAccount) => {
    setEditingUserId(user.id);
    setEditForm({ username: user.username, password: '' });
    setErrorMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditForm({ username: '', password: '' });
    setErrorMessage(null);
  };

  const handleSave = async (userId: string) => {
    if (!editForm.username.trim()) {
      setErrorMessage('Username cannot be empty.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await updateUserCredentials(
        userId,
        editForm.username.trim(),
        editForm.password.trim() || undefined
      );

      onToast('User credentials updated successfully.', 'success');
      setEditingUserId(null);
      setEditForm({ username: '', password: '' });
      await loadUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update credentials.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4" />
            Security & Access Control
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            EDIT USER & PASSWORD
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage credentials for Hotel IT Department staff accounts
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isLoggedIn ? 'BACK TO DASHBOARD' : 'BACK TO LOGIN'}</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 mb-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Loading user accounts...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">
                IT Staff Seed Accounts ({users.length})
              </span>
            </div>
            <span className="text-xs text-slate-400">Credentials take effect immediately</span>
          </div>

          <div className="divide-y divide-slate-100">
            {users.map((usr, index) => {
              const isEditing = editingUserId === usr.id;

              return (
                <div key={usr.id} className="p-5 sm:p-6 transition-colors hover:bg-slate-50/60">
                  {!isEditing ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-slate-900">{usr.username}</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-slate-100 text-slate-600">
                              {usr.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                            <Key className="w-3.5 h-3.5" />
                            <span>Password: ••••••••</span>
                            <span className="text-slate-300">•</span>
                            <span>ID: {usr.id}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(usr)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors self-start sm:self-auto"
                      >
                        <Edit3 className="w-4 h-4 text-slate-500" />
                        <span>Edit</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                          Editing User {index + 1} ({usr.role})
                        </div>
                        <span className="text-xs text-slate-400">Leave password empty to keep existing password</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Username
                          </label>
                          <input
                            type="text"
                            value={editForm.username}
                            onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toUpperCase() })}
                            className="w-full px-3.5 py-2 text-sm font-mono font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            placeholder="e.g. ITMANAGER"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            New Password
                          </label>
                          <input
                            type="password"
                            value={editForm.password}
                            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                            className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            placeholder="Enter new password (optional)"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSave(usr.id)}
                          disabled={isSaving}
                          className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-all disabled:opacity-50"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>SAVE CHANGES</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info Notice */}
      <div className="mt-6 p-4 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800">Direct Activation:</span> When you save changes, the updated credentials are immediately hashed and stored on the server. You can immediately log in with the new credentials from any browser without restarting the server.
        </div>
      </div>
    </div>
  );
};
