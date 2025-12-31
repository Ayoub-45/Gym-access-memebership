"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Checking access...");

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

    fetch("http://localhost:5000/api/verify/ping", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setMsg(data.success ? "Ready to scan QR ✅" : "Access denied"))
      .catch(() => setMsg("Backend not reachable"));
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow p-6">
        <h1 className="text-xl font-bold mb-2 text-green-600">QR Verification</h1>
        <p className="text-gray-600">{msg}</p>

        <div className="mt-6 p-4 border rounded-lg text-sm text-gray-500">
          Scan the member's QR code at the gym entrance to verify their membership and log their visit.
        </div>
      </div>
    </div>
  );
}
