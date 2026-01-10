'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from "../../lib/api";

export default function AddMember() {
  const [form, setForm] = useState({
    name: '',
    membership_start: '',
    membership_end: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Validate required fields
    if (!form.email.trim() || !form.password.trim()) {
      setMessage('❌ Email and password are required');
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');

    const res = await fetch(apiUrl('/api/members'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(form), // Send all fields as-is
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      setMessage('✅ Member added successfully! They can now login with their credentials.');
      router.refresh();
      setTimeout(() => router.push('/dashboard'), 2500);
    } else {
      setMessage(`❌ ${data.error}`);
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h1 className="text-4xl font-black text-gray-900 mb-4">Add New Member</h1>
            <p className="text-xl text-gray-700 font-semibold">Create membership access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {message && (
              <div className={`p-4 rounded-2xl shadow-md font-semibold text-base ${
                message.includes('✅') 
                  ? 'bg-emerald-100 border-4 border-emerald-200 text-emerald-900' 
                  : 'bg-red-100 border-4 border-red-200 text-red-900'
              }`}>
                {message}
              </div>
            )}

            {/* Name - DARK TEXT */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">👤 Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-5 py-5 text-xl text-gray-900 font-semibold border-2 border-gray-200 rounded-2xl 
                           bg-white/80 focus:bg-white focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 
                           shadow-inner hover:shadow-md transition-all duration-300 placeholder-gray-500 
                           placeholder:font-normal placeholder:text-gray-500"
                placeholder="John Doe"
                required
              />
            </div>

            {/* Email - NOW REQUIRED */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                📧 Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-5 py-5 text-xl text-gray-900 font-semibold border-2 border-gray-200 rounded-2xl
                bg-white/80 focus:bg-white focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500
                shadow-inner hover:shadow-md transition-all duration-300 placeholder-gray-500
                placeholder:font-normal placeholder:text-gray-500"
                placeholder="member@email.com"
                required
              />
            </div>

            {/* Password - NOW REQUIRED */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                🔑 Password *
              </label>
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
            </div>

            {/* Dates - DARK TEXT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3">📅 Start Date *</label>
                <input
                  type="date"
                  value={form.membership_start}
                  onChange={(e) => setForm({ ...form, membership_start: e.target.value })}
                  className="w-full px-5 py-5 text-xl text-gray-900 font-semibold border-2 border-gray-200 rounded-2xl 
                             bg-white/80 focus:bg-white focus:ring-4 focus:ring-emerald-500/30 focus:border-emerald-500 
                             shadow-inner hover:shadow-md transition-all duration-300"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3">📅 End Date *</label>
                <input
                  type="date"
                  value={form.membership_end}
                  onChange={(e) => setForm({ ...form, membership_end: e.target.value })}
                  className="w-full px-5 py-5 text-xl text-gray-900 font-semibold border-2 border-gray-200 rounded-2xl 
                             bg-white/80 focus:bg-white focus:ring-4 focus:ring-orange-500/30 focus:border-orange-500 
                             shadow-inner hover:shadow-md transition-all duration-300"
                  required
                />
              </div>
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
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Adding Member...
                </>
              ) : '➕ Add Member'}
            </button>
          </form>

          <p className="text-sm text-center text-gray-600 mt-6">
            Status: ACTIVE • Member will receive login credentials to access their account
          </p>
        </div>
      </div>
    </div>
  );
}