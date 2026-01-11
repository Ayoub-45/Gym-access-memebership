"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from '../../lib/api';

type AccessLog = {
  id: string;
  member_name: string;
  scanned_at: string;
  result: "SUCCESS" | "DENIED_EXPIRED" | "DENIED_INACTIVE" | "DENIED_INVALID";
  reason: string | null;
};

type Stats = {
  total: number;
  success: number;
  denied: number;
};

export default function AccessLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("ALL"); // ALL, SUCCESS, DENIED
  const [limit, setLimit] = useState(100);

  // Fetch logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("token");
        
        const res = await fetch(
          apiUrl(`/api/access-logs?limit=${limit}`),
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await res.json();
        
        if (!data.success) {
          throw new Error(data.error || "Failed to load logs");
        }

        setLogs(data.logs);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [limit]);

  // Calculate stats
  const stats: Stats = {
    total: logs.length,
    success: logs.filter((log) => log.result === "SUCCESS").length,
    denied: logs.filter((log) => log.result !== "SUCCESS").length,
  };

  // Filter logs based on selected filter
  const filteredLogs = logs.filter((log) => {
    if (filter === "ALL") return true;
    if (filter === "SUCCESS") return log.result === "SUCCESS";
    if (filter === "DENIED") return log.result !== "SUCCESS";
    return true;
  });

  // Format date and time
  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { date: dateStr, time: timeStr };
  };

  // Get badge styling based on result
  const getResultBadge = (result: string) => {
    const badges = {
      SUCCESS: "bg-green-100 text-green-800 border-green-200",
      DENIED_EXPIRED: "bg-orange-100 text-orange-800 border-orange-200",
      DENIED_INACTIVE: "bg-red-100 text-red-800 border-red-200",
      DENIED_INVALID: "bg-red-100 text-red-800 border-red-200",
    };

    const label = result.replace("DENIED_", "").replace("_", " ");

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border-2 ${
          badges[result as keyof typeof badges] || "bg-gray-100 text-gray-800 border-gray-200"
        }`}
      >
        {label}
      </span>
    );
  };

  // Format reason
  const formatReason = (reason: string | null) => {
    return reason || "N/A";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                Access Logs
              </h1>
              <p className="text-indigo-100 font-semibold">
                View all member access attempts and security events
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white font-bold rounded-2xl shadow-lg hover:bg-white/30 transition-all border border-white/30"
            >
              Back
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-100 border border-red-200 text-red-900 font-semibold">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <p className="text-sm font-bold text-gray-600 mb-2">Total Scans</p>
            <p className="text-4xl font-black text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <p className="text-sm font-bold text-gray-600 mb-2">Successful</p>
            <p className="text-4xl font-black text-green-700">{stats.success}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <p className="text-sm font-bold text-gray-600 mb-2">Denied</p>
            <p className="text-4xl font-black text-red-700">{stats.denied}</p>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex flex-wrap items-center gap-4">
            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("ALL")}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  filter === "ALL"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All ({logs.length})
              </button>
              <button
                onClick={() => setFilter("SUCCESS")}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  filter === "SUCCESS"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Success ({stats.success})
              </button>
              <button
                onClick={() => setFilter("DENIED")}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  filter === "DENIED"
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Denied ({stats.denied})
              </button>
            </div>

            {/* Limit Selector */}
            <div className="ml-auto flex items-center gap-2">
              <label className="text-sm font-bold text-gray-700">Show:</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b bg-gray-50">
            <h2 className="text-xl font-black text-gray-900">Recent Activity</h2>
            <p className="text-sm text-gray-600">
              Showing {filteredLogs.length} access{" "}
              {filteredLogs.length === 1 ? "attempt" : "attempts"}
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-700 font-semibold">
              Loading access logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-700 font-semibold mb-2">No access logs yet</p>
              <p className="text-gray-500 text-sm">
                Access attempts will appear here once members start scanning QR codes
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white border-b-2">
                  <tr>
                    <th className="px-6 py-4 text-sm font-black text-gray-900">
                      Member
                    </th>
                    <th className="px-6 py-4 text-sm font-black text-gray-900">
                      Date & Time
                    </th>
                    <th className="px-6 py-4 text-sm font-black text-gray-900">
                      Result
                    </th>
                    <th className="px-6 py-4 text-sm font-black text-gray-900">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const { date, time } = formatDateTime(log.scanned_at);
                    return (
                      <tr
                        key={log.id}
                        className="border-b hover:bg-indigo-50/40 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900">{log.member_name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">{date}</p>
                          <p className="text-sm text-gray-600">{time}</p>
                        </td>
                        <td className="px-6 py-4">{getResultBadge(log.result)}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-700 font-medium">
                            {formatReason(log.reason)}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
