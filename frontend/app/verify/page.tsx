"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserQRCodeReader } from "@zxing/browser";
import { apiUrl } from "../lib/api";

export default function VerifyPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [role, setRole] = useState<null | "admin" | "staff">(null);

  const [msg, setMsg] = useState("Ready.");
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null); // {success, message, member?, error?}
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");
    const user = userRaw ? JSON.parse(userRaw) : null;

    if (!token || !user) {
      router.push("/login");
      return;
    }
    if (!["staff", "admin"].includes(user.role)) {
      router.push("/login");
      return;
    }

    setRole(user.role);

    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [router]);

  const verifyQRCode = async (qrData: string) => {
    try {
      setError("");
      setVerifying(true);
      setMsg("Verifying...");

      const token = localStorage.getItem("token");

      const res = await fetch(apiUrl("/api/qr/verify"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ qrData }),
      });

      const data = await res.json();
      setVerificationResult(data); // Store full result

      if (data.success) {
        setMsg(`✅ ${data.message || "Access granted"}`);
      } else {
        setMsg(`❌ ${data.error || data.message || "Access denied"}`);
      }
    } catch (e: any) {
      const errData = { success: false, error: e.message || "Verify failed" };
      setVerificationResult(errData);
      setError(e.message || "Verify failed");
      setMsg("❌ Server error");
    } finally {
      setVerifying(false);
    }
  };

  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!verificationResult?.member?.membershipEnd) return;
    const endDate = new Date(verificationResult.member.membershipEnd);
    const updateCountdown = () => {
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown('Expired');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(days ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m ${seconds}s`);
    };
    const interval = setInterval(updateCountdown, 1000);
    updateCountdown();
    return () => clearInterval(interval);
  }, [verificationResult?.member?.membershipEnd]);

  const start = async () => {
    try {
      setError("");
      setMsg("Scanning...");
      setScanning(true);
      setVerificationResult(null); // Reset result

      const reader = new BrowserQRCodeReader();
      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        async (result, _err, controls) => {
          if (result) {
            controls.stop();
            controlsRef.current = null;
            setScanning(false);
            await verifyQRCode(result.getText());
          }
        }
      );
    } catch (e: any) {
      setScanning(false);
      setError(e.message || "Camera/scanner failed");
      setMsg("❌ Error");
    }
  };

  const stop = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
    setMsg("Stopped.");
  };

  const isGreen = verificationResult?.success;
  const bgClass = isGreen 
    ? 'bg-gradient-to-br from-emerald-400/95 to-emerald-500 min-h-screen flex items-center justify-center p-6' 
    : 'bg-gradient-to-br from-red-400/95 to-red-500 min-h-screen flex items-center justify-center p-6';
  const textClass = isGreen ? 'text-emerald-900' : 'text-red-900';
  const borderClass = isGreen ? 'border-emerald-200' : 'border-red-200';

  // Result Screen (Full Alert)
  if (verificationResult && !scanning) {
    return (
      <div className={bgClass}>
        <div className={`max-w-xl w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border-8 ${borderClass} p-8 text-center`}>
          {/* Icon */}
          <div className="w-28 h-28 mx-auto mb-8 rounded-3xl flex items-center justify-center bg-white shadow-2xl border-4 border-white">
            <svg className={`w-16 h-16 ${textClass} fill-current`} viewBox="0 0 24 24">
              {isGreen ? (
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="0"/>
              ) : (
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="0"/>
              )}
            </svg>
          </div>

          {/* Main Message */}
          <h1 className={`text-4xl font-black ${textClass} mb-6 drop-shadow-lg`}>
            {isGreen ? 'Access Granted' : 'Access Denied'}
          </h1>
          <div className={`text-xl font-bold ${textClass} mb-8 px-8 py-6 bg-white/60 rounded-3xl shadow-xl border-2 border-white drop-shadow-lg`}>
            {msg} {/* Backend message with emoji */}
          </div>

          {/* Member Details */}
          {verificationResult.member && verificationResult.member.status !== 'INACTIVE' && (
            <div className="bg-white/70 rounded-2xl p-6 mb-8 shadow-xl backdrop-blur-sm">
              <p className="text-2xl font-black text-gray-900 mb-4">{verificationResult.member.name}</p>
              
              {/* Check if membership is expired */}
              {verificationResult.member.membershipEnd && new Date() >= new Date(verificationResult.member.membershipEnd) ? (
                // Expired membership design
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-2xl border-4 border-red-300">
                        <span className="text-white font-black text-xs uppercase tracking-wide">Expired</span>
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 rounded-full border-2 border-white flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-600 mb-1">Membership Ended</p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 border-2 border-red-300 rounded-xl">
                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                      </svg>
                      <span className="text-red-800 font-black text-lg">
                        {new Date(verificationResult.member.membershipEnd).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                // Active membership design (original)
                <div className="flex items-center justify-center gap-4 text-lg">
                  <span className={`px-6 py-3 rounded-2xl font-bold border-4 shadow-lg ${isGreen ? 'bg-emerald-200 text-emerald-900 border-emerald-400' : 'bg-red-200 text-red-900 border-red-400'}`}>
                    {verificationResult.member.status}
                  </span>
                  {verificationResult.member.membershipEnd && (
                    <span className="text-xl font-bold text-gray-800 bg-white/60 px-6 py-3 rounded-2xl shadow-lg">
                      Expires: {new Date(verificationResult.member.membershipEnd).toLocaleDateString('en-US', { 
                        month: '2-digit', 
                        day: '2-digit', 
                        year: '2-digit' 
                      }).replace(/\//g, '-')}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}


          {/* Buttons */}
          <div className="flex flex-col gap-4 mb-6">
            <button
              onClick={() => {
                setVerificationResult(null);
                setTimeout(() => start(), 100);
              }}
              disabled={verifying}
              className="w-full px-8 py-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-black text-xl rounded-2xl shadow-2xl hover:shadow-3xl hover:from-purple-600 hover:to-purple-700 active:scale-[0.98] transition-all border border-purple-400/50 disabled:opacity-50"
            >
              {verifying ? 'Verifying...' : 'Scan Another QR'}
            </button>
            
            {role === "admin" ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full px-8 py-6 bg-white/80 border-4 border-purple-300 text-purple-700 font-black text-xl rounded-2xl shadow-xl hover:shadow-2xl hover:bg-white hover:border-purple-400 hover:text-purple-800 backdrop-blur-sm transition-all active:scale-[0.98]"
              >
                Back to Dashboard
              </button>
            ) : (
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  router.push("/login");
                }}
                className="w-full px-8 py-6 bg-white/80 border-4 border-purple-300 text-purple-700 font-black text-xl rounded-2xl shadow-xl hover:shadow-2xl hover:bg-white hover:border-purple-400 hover:text-purple-800 backdrop-blur-sm transition-all active:scale-[0.98]"
              >
                Logout
              </button>
            )}
          </div>

        </div>
      </div>
    );
  }

  // Scanning Screen (Original Layout)
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-green-700">QR Verification</h1>
          {role === "admin" && (
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
            >
              Dashboard
            </button>
          )}
          {role === "staff" && (
            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                router.push("/login");
              }}
              className="px-4 py-2 rounded-xl bg-gray-700 text-white font-bold hover:bg-gray-800"
            >
              Logout
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border-4 border-red-200 text-red-800 text-base font-bold shadow-md">
            {error}
          </div>
        )}

        <div className="rounded-2xl overflow-hidden bg-black shadow-2xl mb-6">
          <video ref={videoRef} className="w-full" />
        </div>

        <div className="flex gap-3 mb-6">
          {!scanning ? (
            <button
              onClick={start}
              disabled={verifying}
              className="flex-1 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-black text-lg shadow-xl hover:shadow-2xl hover:from-emerald-700 disabled:opacity-60 transition-all"
            >
              {verifying ? "Verifying..." : "Start Scanning"}
            </button>
          ) : (
            <button
              onClick={stop}
              className="flex-1 px-6 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 text-white font-black text-lg shadow-xl hover:shadow-2xl transition-all"
            >
              Stop Scanning
            </button>
          )}
        </div>

        {!scanning && verificationResult && (
          <button
            onClick={start}
            disabled={verifying}
            className="w-full px-6 py-4 rounded-2xl bg-indigo-600 text-white font-black text-lg shadow-xl hover:shadow-2xl hover:bg-indigo-700 mb-6 disabled:opacity-60 transition-all"
          >
            Scan Another
          </button>
        )}

        <p className="text-lg font-semibold text-gray-900 mb-2">{msg}</p>
        <p className="text-sm text-gray-600">Tip: Hold QR steady 1-2 seconds, avoid glare.</p>
      </div>
    </div>
  );
}
