'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '../../lib/api';

export default function CreateStaffPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(apiUrl('/api/auth/staff'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        setMessage('✅ Staff created successfully!');
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        setMessage(`❌ ${data.error || 'Failed to create staff'}`);
      }
    } catch (err) {
      setMessage('❌ Network/server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center px-4 py-2 mb-8 text-sm font-bold text-gray-800 bg-white/90 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-lg transition-all backdrop-blur-sm"
        >
          ← Back
        </button>

        <div className="bg-white shadow-2xl rounded-3xl p-8 border border-gray-100/50 backdrop-blur-xl">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl mx-auto mb-6 shadow-2xl flex items-center justify-center">
              <svg className="w-11 h-11 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
                />
                <circle cx="9" cy="7" r="4" strokeWidth={1.5} />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 8v6m3-3h-6"
                />
              </svg>
            </div>

            <h1 className="text-4xl font-black text-gray-900 mb-4">Create Staff</h1>
            <p className="text-xl text-gray-700 font-semibold">
              Add a staff account linked to your gym
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {message && (
              <div
                className={`p-4 rounded-2xl shadow-md font-semibold text-base ${
                  message.includes('✅')
                    ? 'bg-emerald-100 border-4 border-emerald-200 text-emerald-900'
                    : 'bg-red-100 border-4 border-red-200 text-red-900'
                }`}
              >
                {message}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">📧 Staff Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-5 py-5 text-xl text-gray-900 font-semibold border-2 border-gray-200 rounded-2xl 
                           bg-white/80 focus:bg-white focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 
                           shadow-inner hover:shadow-md transition-all duration-300 placeholder-gray-500 
                           placeholder:font-normal placeholder:text-gray-500"
                placeholder="staff@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">🔒 Temporary Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-5 py-5 text-xl text-gray-900 font-semibold border-2 border-gray-200 rounded-2xl 
                           bg-white/80 focus:bg-white focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 
                           shadow-inner hover:shadow-md transition-all duration-300 placeholder-gray-500 
                           placeholder:font-normal placeholder:text-gray-500"
                placeholder="Enter a password"
                required
              />
              <p className="mt-2 text-sm text-gray-600 font-medium">
                Tip: share this password with the staff member (they can change it later if you add that feature).
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 
                         text-white py-6 px-8 rounded-2xl font-black text-xl shadow-2xl hover:shadow-3xl 
                         transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="inline w-6 h-6 mr-2 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating staff...
                </>
              ) : (
                '➕ Create Staff'
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-600 font-medium">
            Staff will be automatically linked to your gym.
          </p>
        </div>
      </div>
    </div>
  );
}
