'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function EditMemberPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    membership_start: '',
    membership_end: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        setError('');
        const token = localStorage.getItem('token');

        const res = await fetch('http://localhost:5000/api/members', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to load members');

        const m = data.members.find((x: any) => x.id === memberId);
        if (!m) throw new Error('Member not found');

        setForm({
          name: m.name || '',
          membership_start: m.membership_start || '',
          membership_end: m.membership_end || '',
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (memberId) load();
  }, [memberId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`http://localhost:5000/api/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Update failed');

      router.push('/dashboard/members');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-100 p-6">
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-2xl border border-gray-100 p-6">
        <button onClick={() => router.back()} className="mb-6 font-bold text-indigo-700">
          ← Back
        </button>

        <h1 className="text-2xl font-black text-gray-900 mb-2">Edit Member</h1>
        <p className="text-gray-600 mb-6">Update membership details.</p>

        {error && (
          <div className="mb-4 p-4 rounded-2xl bg-red-100 border border-red-200 text-red-900 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={save} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Full Name</label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 font-semibold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Start Date</label>
              <input
                type="date"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 font-semibold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={form.membership_start}
                onChange={(e) => setForm({ ...form, membership_start: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">End Date</label>
              <input
                type="date"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 font-semibold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={form.membership_end}
                onChange={(e) => setForm({ ...form, membership_end: e.target.value })}
                required
              />
            </div>
          </div>

          <button
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-black hover:from-indigo-700 hover:to-purple-800 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
