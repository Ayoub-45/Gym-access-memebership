'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from "date-fns";

const formatDT = (v?: string) => {
  if (!v) return "-";
  const d = parseISO(v);
  return format(d, "yyyy-MM-dd");
};

type Member = {
  id: string;
  name: string;
  membership_start: string;
  membership_end: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMembers = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/members', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load members');
      setMembers(data.members);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const deactivate = async (id: string) => {
    if (!confirm('Deactivate this member? They will be denied access.')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/members/${id}/deactivate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Deactivate failed');

      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'INACTIVE' } : m)));
    } catch (e: any) {
      alert(e.message);
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
                Manage Members
              </h1>
              <p className="text-indigo-100 font-semibold">
                Edit memberships and deactivate access
              </p>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white font-bold rounded-2xl shadow-lg hover:bg-white/30 transition-all border border-white/30"
            >
              ← Back
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
            <p className="text-sm font-bold text-gray-600">Total</p>
            <p className="text-3xl font-black text-gray-900">{members.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
            <p className="text-sm font-bold text-gray-600">Active</p>
            <p className="text-3xl font-black text-emerald-700">
              {members.filter((m) => m.status === 'ACTIVE').length}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
            <p className="text-sm font-bold text-gray-600">Inactive</p>
            <p className="text-3xl font-black text-red-700">
              {members.filter((m) => m.status === 'INACTIVE').length}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b bg-gray-50">
            <h2 className="text-xl font-black text-gray-900">Members List</h2>
            <p className="text-sm text-gray-600">
              Deactivated members are denied access.
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-gray-700 font-semibold">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="p-10 text-gray-700 font-semibold">No members yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white">
                  <tr className="border-b">
                    <th className="px-6 py-4 text-sm font-black text-gray-900">Member</th>
                    <th className="px-6 py-4 text-sm font-black text-gray-900">Start</th>
                    <th className="px-6 py-4 text-sm font-black text-gray-900">End</th>
                    <th className="px-6 py-4 text-sm font-black text-gray-900">Status</th>
                    <th className="px-6 py-4 text-sm font-black text-gray-900">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b hover:bg-indigo-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{m.name}</p>
                        <p className="text-xs text-gray-500 break-all">ID: {m.id}</p>
                      </td>

                      <td className="px-6 py-4 font-semibold text-gray-800">{formatDT(m.membership_start)}</td>
                      <td className="px-6 py-4 font-semibold text-gray-800">{formatDT(m.membership_end)}</td>

                      <td className="px-6 py-4">
                        {m.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-black text-xs border border-emerald-200">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-900 font-black text-xs border border-red-200">
                            INACTIVE
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {/* NEW: View QR Button */}
                          <button
                            onClick={() => router.push(`/dashboard/members/${m.id}`)}
                            className="px-4 py-2 rounded-xl bg-green-600 text-white font-black hover:bg-green-700 transition-all flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            QR
                          </button>

                          <button
                            onClick={() => router.push(`/dashboard/members/${m.id}/edit`)}
                            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deactivate(m.id)}
                            disabled={m.status !== 'ACTIVE'}
                            className="px-4 py-2 rounded-xl bg-red-600 text-white font-black hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Deactivate
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
