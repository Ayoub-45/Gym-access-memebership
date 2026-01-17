'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/app/lib/api';

type Member = {
  id: string;
  name: string;
  email: string | null;
  membership_start: string;
  membership_end: string;
  status: string;
};

export default function MemberDashboard() {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [gymLogo, setGymLogo] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');


  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');

    if (!token || !userRaw) {
        router.replace('/login');
        return;
    }

    const user = JSON.parse(userRaw);
    if (user.role !== 'member') {
        router.replace('/dashboard');
        return;
    }

    (async () => {
        try {
        // 1) Load member info
        const res = await fetch(apiUrl('/api/member/me'), {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.success) {
            setError(data.error || 'Failed to load membership');
            return;
        }
        setMember(data.member);

        // 2) Load gym logo (NEW: put it here)
        const gymRes = await fetch(apiUrl('/api/gym/profile'), {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (gymRes.ok) {
            const gymData = await gymRes.json();
            if (gymData.success) {
            setGymLogo(gymData.gym.logo || null);
            }
        }
        } catch {
        setError('Server error');
        } finally {
        setLoading(false);
        }
    })();
    }, [router]);

    // Countdown timer for QR expiration
    useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(expiresAt).getTime();
        const diff = expiry - now;

        if (diff <= 0) {
        setTimeLeft('Expired');
        setQrCode('');  // Clear expired QR
        clearInterval(interval);
        } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
        }
    }, 1000);

    return () => clearInterval(interval);
    }, [expiresAt]);

  const loadQR = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setQrLoading(true);
    setError('');
    try {
        const res = await fetch(apiUrl('/api/qr/my-qr'), {  // Changed from /api/qr/me to /api/qr/my-qr
        headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.success) {
        setError(data.error || 'Failed to generate QR');
        return;
        }
        setQrCode(data.qrCode);
        setExpiresAt(data.expiresAt);  // NEW: Store expiration time
    } catch {
        setError('Server error generating QR');
    } finally {
        setQrLoading(false);
    }
    };


  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
            <div>
            <h1 className="text-3xl font-black text-gray-900">Member Portal</h1>
            <p className="text-sm text-gray-600 font-medium">
                Your membership details & access QR
            </p>
            </div>

            <button
            onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.replace('/login');
            }}
            className="px-4 py-2 rounded-xl font-bold text-sm text-gray-700 bg-white/90 border-2 border-gray-200 hover:bg-gray-50 hover:shadow-lg transition-all backdrop-blur-sm"
            >
            Logout
            </button>
        </div>

        {/* Card */}
        <div className="bg-white shadow-2xl rounded-3xl p-8 border border-gray-100/50 backdrop-blur-xl">
            {/* Header */}
            <div className="text-center mb-8">
            <div className="w-24 h-24 rounded-3xl mx-auto mb-5 shadow-2xl flex items-center justify-center overflow-hidden bg-white
                ring-2 ring-indigo-200/80 border border-white">
            {gymLogo ? (
                <img
                src={apiUrl(`/uploads/${gymLogo.split('/').pop()}`)}
                alt="Gym logo"
                className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 11c0 3.866-3.134 7-7 7m14 0c-3.866 0-7-3.134-7-7m0 0c0-3.866 3.134-7 7-7m-14 0c3.866 0 7 3.134 7 7z"
                    />
                </svg>
                </div>
            )}
            </div>

            <h2 className="text-3xl font-black text-gray-900">My Membership</h2>
            <p className="text-sm text-gray-600 font-medium mt-1">
                Show this QR at the gym entrance.
            </p>
            </div>

            {/* Error */}
            {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-800 px-4 py-3 rounded-2xl font-semibold">
                {error}
            </div>
            )}

            {/* Member info */}
            {member && (
            <div className="mb-8 grid grid-cols-1 gap-4">
                <div className="rounded-2xl border-2 border-gray-100 bg-gray-50 p-5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Name</p>
                <p className="text-lg font-black text-gray-900 mt-1">{member.name}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border-2 border-gray-100 bg-gray-50 p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Start date</p>
                    <p className="text-lg font-black text-gray-900 mt-1">{member.membership_start}</p>
                </div>

                <div className="rounded-2xl border-2 border-gray-100 bg-gray-50 p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">End date</p>
                    <p className="text-lg font-black text-gray-900 mt-1">{member.membership_end}</p>
                </div>
                </div>

                <div className="rounded-2xl border-2 border-gray-100 bg-gray-50 p-5 flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Status</p>
                    <p className="text-lg font-black text-gray-900 mt-1">{member.status}</p>
                </div>

                <span
                    className={`px-4 py-2 rounded-xl text-sm font-black border-2 ${
                    member.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                        : 'bg-red-100 text-red-900 border-red-200'
                    }`}
                >
                    {member.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </span>
                </div>
            </div>
            )}

            {/* QR Code Section */}
            <div className="mt-8 text-center">
                <h3 className="text-xl font-black text-gray-900 mb-2">My QR Code</h3>
                <p className="text-gray-600 mb-4">Single-use code • Valid 30 minutes</p>

                {/* Countdown Timer */}
                {qrCode && timeLeft && (
                <div className="mb-4">
                    <div className={`inline-block px-4 py-2 rounded-full font-bold text-sm ${
                    timeLeft === 'Expired' 
                        ? 'bg-red-100 text-red-800 border-2 border-red-300'
                        : 'bg-green-100 text-green-800 border-2 border-green-300'
                    }`}>
                    {timeLeft === 'Expired' ? '❌ Expired' : `⏱️ ${timeLeft}`}
                    </div>
                </div>
                )}

                {!qrCode ? (
                <button
                    onClick={loadQR}
                    disabled={qrLoading}
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-black text-lg rounded-2xl hover:from-indigo-700 hover:to-purple-800 disabled:opacity-60 transition-all shadow-xl"
                >
                    {qrLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                    </>
                    ) : (
                    <>
                        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        Generate QR Code
                    </>
                    )}
                </button>
                ) : (

                <div className="space-y-6">
                    {/* QR Code */}
                    <div className="inline-block p-6 bg-white rounded-2xl shadow-2xl border-4 border-indigo-200">
                    <img src={qrCode} alt="My QR Code" className="w-64 h-64" />
                    </div>

                    {/* Warning */}
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 text-left">
                    <p className="text-yellow-900 font-bold text-sm">⚠️ Single-Use QR Code</p>
                    <p className="text-yellow-800 text-xs mt-1">
                        This code works only once. Generate a new one for your next visit.
                    </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 justify-center">
                        {/* Download Button */}
                        <button
                            onClick={() => {
                            if (!qrCode) return;
                            const link = document.createElement('a');
                            link.href = qrCode;
                            link.download = `${member?.name.replace(/\s/g, '_')}_QR.png`;
                            link.click();
                            }}
                            className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download QR
                        </button>
                        
                        {/* Generate New Button */}
                        <button 
                            onClick={loadQR} 
                            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all"
                        >
                            Generate New
                        </button>
                    </div>
                </div>
                )}
            </div>
        </div>
        </div>
    </div>
    );
}
