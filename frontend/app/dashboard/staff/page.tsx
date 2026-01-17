'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '../../lib/api';

type Staff = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

export default function StaffManagementPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});

  const fetchStaff = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/api/staff'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (!data.success) throw new Error(data.error || 'Failed to load staff');
      setStaff(data.staff);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const startEdit = (s: Staff) => {
    setEditingId(s.id);
    setEditForm({ email: s.email, password: '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ email: '', password: '' });
  };

  const saveEdit = async (id: string) => {
    try {
      if (!editForm.email.trim()) {
        alert('Email is required');
        return;
      }

      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/api/staff/${id}`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      
      if (!data.success) throw new Error(data.error || 'Update failed');

      setStaff((prev) =>
        prev.map((s) => (s.id === id ? { ...s, email: data.staff.email } : s))
      );
      setEditingId(null);
      setEditForm({ email: '', password: '' });
      alert('✅ Staff updated successfully!');
    } catch (e: any) {
      alert(`❌ ${e.message}`);
    }
  };

  const deleteStaff = async (id: string) => {
    if (!confirm('Delete this staff member? They will lose access immediately.')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/api/staff/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      
      if (!data.success) throw new Error(data.error || 'Delete failed');

      setStaff((prev) => prev.filter((s) => s.id !== id));
      alert('✅ Staff deleted successfully');
    } catch (e: any) {
      alert(`❌ ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                Manage Staff
              </h1>
              <p className="text-indigo-100 font-semibold">
                View and edit staff credentials
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white font-bold rounded-2xl shadow-lg hover:bg-white/30 transition-all border border-white/30"
            >
              Back
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-100 border border-red-200 text-red-900 font-semibold">
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
            <p className="text-sm font-bold text-gray-600">Total Staff</p>
            <p className="text-3xl font-black text-gray-900">{staff.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
            <p className="text-sm font-bold text-gray-600">Action</p>
            <button
              onClick={() => router.push('/dashboard/create-staff')}
              className="mt-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700"
            >
              + Add New Staff
            </button>
          </div>
        </div>

        {/* Staff List */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b bg-gray-50">
            <h2 className="text-xl font-black text-gray-900">Staff List</h2>
            <p className="text-sm text-gray-600">
              Click Edit to update email or password (passwords are hidden for security)
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-gray-700 font-semibold">Loading staff...</div>
          ) : staff.length === 0 ? (
            <div className="p-10 text-gray-700 font-semibold">No staff yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white">
                  <tr className="border-b">
                    <th className="px-6 py-4 text-sm font-black text-gray-900">Email</th>
                    <th className="px-6 py-4 text-sm font-black text-gray-900">Password</th>
                    <th className="px-6 py-4 text-sm font-black text-gray-900">Created</th>
                    <th className="px-6 py-4 text-sm font-black text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-indigo-50/40 transition-colors">
                      <td className="px-6 py-4">
                        {editingId === s.id ? (
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) =>
                              setEditForm({ ...editForm, email: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-semibold text-gray-900"
                            placeholder="staff@example.com"
                          />
                        ) : (
                          <p className="font-bold text-gray-900">{s.email}</p>
                        )}
                        <p className="text-xs text-gray-500 break-all">ID: {s.id}</p>
                      </td>
                      
                      <td className="px-6 py-4">
                        {editingId === s.id ? (
                            <div className="relative">
                            <input
                                type={showPassword[s.id] ? 'text' : 'password'}
                                value={editForm.password}
                                onChange={(e) =>
                                setEditForm({ ...editForm, password: e.target.value })
                                }
                                className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500"
                                placeholder="New password (leave empty to keep current)"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                setShowPassword((prev) => ({
                                    ...prev,
                                    [s.id]: !prev[s.id],
                                }))
                                }
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                title={showPassword[s.id] ? 'Hide password' : 'Show password'}
                            >
                                {showPassword[s.id] ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                                ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                )}
                            </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-mono text-lg">••••••••</span>
                            <span className="text-xs text-gray-400 italic">(encrypted)</span>
                            </div>
                        )}
                        </td>
                      
                      <td className="px-6 py-4 font-semibold text-gray-800">
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {editingId === s.id ? (
                            <>
                              <button
                                onClick={() => saveEdit(s.id)}
                                className="px-4 py-2 rounded-xl bg-green-600 text-white font-black hover:bg-green-700 transition-all"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-4 py-2 rounded-xl bg-gray-500 text-white font-black hover:bg-gray-600 transition-all"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(s)}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteStaff(s.id)}
                                className="px-4 py-2 rounded-xl bg-red-600 text-white font-black hover:bg-red-700 transition-all"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Security Note */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-yellow-600 mr-3 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-bold text-yellow-900">Security Note</p>
              <p className="text-sm text-yellow-800">
                Passwords are encrypted in the database. When editing, leave password empty to keep the current one, or enter a new password to update it.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
