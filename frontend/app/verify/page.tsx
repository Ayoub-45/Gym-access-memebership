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
  const [lastResult, setLastResult] = useState<null | "OK" | "DENIED">(null);
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

      // ✅ set role after validation
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
      setLastResult(null);
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

      if (data.success) {
        setLastResult("OK");
        setMsg(`✅ ${data.message || "Access granted"}`);
      } else {
        setLastResult("DENIED");
        setMsg(`❌ ${data.error || "Access denied"}`);
      }
    } catch (e: any) {
      setError(e.message || "Verify failed");
      setLastResult("DENIED");
      setMsg("❌ Error");
    } finally {
      setVerifying(false);
    }
  };

  const start = async () => {
    try {
      setError("");
      setMsg("Scanning...");
      setScanning(true);
      setLastResult(null);

      const reader = new BrowserQRCodeReader();
      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined, // default camera
        videoRef.current!,
        async (result, _err, controls) => {
          if (result) {
            controls.stop(); // stop after first hit
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

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-green-700">QR Verification</h1>
          {role === "admin" && (
            <button
              onClick={() => router.push("/dashboard")}
              className="px-3 py-2 rounded-lg bg-indigo-600 text-white font-bold"
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
              className="px-3 py-2 rounded-lg bg-gray-700 text-white font-bold"
            >
              Logout
            </button>
          )}
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="rounded-xl overflow-hidden bg-black">
          <video ref={videoRef} className="w-full" />
        </div>

        <div className="mt-4 flex gap-2">
          {!scanning ? (
            <button
              onClick={start}
              disabled={verifying}
              className="flex-1 px-4 py-3 rounded-xl bg-green-600 text-white font-black disabled:opacity-60"
            >
              {verifying ? "Verifying..." : "Start scanning"}
            </button>
          ) : (
            <button
              onClick={stop}
              className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-black"
            >
              Stop scanning
            </button>
          )}
        </div>

        {/* NEW: Scan another (after result) */}
        {!scanning && lastResult && (
          <button
            onClick={start}
            disabled={verifying}
            className="mt-2 w-full px-4 py-3 rounded-xl bg-indigo-600 text-white font-black disabled:opacity-60"
          >
            Scan another
          </button>
        )}

        <p className="mt-3 text-sm text-gray-600">{msg}</p>
        <p className="mt-2 text-xs text-gray-500">
          Tip: make QR bigger, avoid glare, keep it steady 1–2 seconds.
        </p>
      </div>
    </div>
  );
}
