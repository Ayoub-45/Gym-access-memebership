'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiUrl } from "../../../lib/api";

interface Member {
  id: string;
  name: string;
  membership_start: string;
  membership_end: string;
  status: string;
}

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params?.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrLoading, setQrLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch member details
  useEffect(() => {
    const fetchMember = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(apiUrl('/api/members'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        
        if (data.success) {
          const m = data.members.find((x: any) => x.id === memberId);
          if (m) {
            setMember(m);
          } else {
            setError('Member not found');
          }
        }
      } catch (err) {
        setError('Failed to load member');
      } finally {
        setLoading(false);
      }
    };

    if (memberId) fetchMember();
  }, [memberId]);

  // Generate QR code
  const generateQR = async () => {
    setQrLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/api/qr/members/${memberId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      
      if (data.success) {
        setQrCode(data.qrCode);
      } else {
        setError(data.error || 'Failed to generate QR code');
      }
    } catch (err) {
      setError('Server error generating QR code');
    } finally {
      setQrLoading(false);
    }
  };

  // Download QR code
  const downloadQR = () => {
    if (!qrCode) return;
    
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `${member?.name.replace(/\s+/g, '_')}_QR.png`;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-700 font-semibold">Member not found</p>
          <button
            onClick={() => router.push('/dashboard/members')}
            className="mt-4 text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            ← Back to Members
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-100 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.push('/dashboard/members')}
          className="mb-6 inline-flex items-center px-4 py-2 text-sm font-bold text-gray-800 bg-white/90 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-lg transition-all"
        >
          ← Back to Members
        </button>

        {/* Member Info Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black text-gray-900">{member.name}</h1>
              <p className="text-gray-600 mt-1">Member ID: {member.id.slice(0, 8)}...</p>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-bold ${
                member.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {member.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-indigo-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-indigo-600 mb-1">Start Date</p>
              <p className="text-lg font-bold text-gray-900">{member.membership_start}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-purple-600 mb-1">End Date</p>
              <p className="text-lg font-bold text-gray-900">{member.membership_end}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push(`/dashboard/members/${member.id}/edit`)}
              className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all"
            >
              Edit Member
            </button>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8">
          <div className="text-center">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Member QR Code</h2>
            <p className="text-gray-600 mb-6">Scan this code for gym access verification</p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold">
                {error}
              </div>
            )}

            {!qrCode ? (
              <button
                onClick={generateQR}
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
                {/* QR Code Display */}
                <div className="inline-block p-6 bg-white rounded-2xl shadow-2xl border-4 border-indigo-200">
                  <img src={qrCode} alt="Member QR Code" className="w-64 h-64" />
                </div>

                {/* Download Button */}
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={downloadQR}
                    className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download QR
                  </button>
                  <button 
                    onClick={generateQR}
                    disabled={qrLoading}
                    className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-60"
                  >
                    {qrLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Regenerate
                      </>
                    )}
                  </button>
                </div>

                <p className="text-sm text-gray-500 mt-4">
                  ✓ QR Code generated successfully. Staff can scan this for access verification.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
