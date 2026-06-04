"use client";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

const WORKSPACE_ID = process.env.NEXT_PUBLIC_DEMO_WORKSPACE_ID ?? "";

export default function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", WORKSPACE_ID],
    queryFn: () => reportsApi.list(WORKSPACE_ID),
    enabled: !!WORKSPACE_ID,
  });

  const reports = data?.data?.reports ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">SprintPulse</h1>
          <nav className="flex gap-6 text-sm text-gray-600">
            <a href="/dashboard" className="hover:text-gray-900">Dashboard</a>
            <a href="/reports" className="text-blue-700 font-medium">Reports</a>
            <a href="/settings" className="hover:text-gray-900">Settings</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Reports</h2>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">Loading reports...</div>
          ) : !WORKSPACE_ID ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 mb-2">No workspace configured.</p>
              <p className="text-sm text-gray-400">Set <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_DEMO_WORKSPACE_ID</code> in your .env.local to load reports.</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No reports generated yet.</p>
              <p className="text-sm text-gray-400 mt-2">Reports are auto-generated every Friday at 08:00 UTC, or triggered via n8n.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Sprint</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Template</th>
                  <th className="text-left px-6 py-3">Generated</th>
                  <th className="text-left px-6 py-3">Channels</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{r.sprint_name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === "sent" ? "bg-green-100 text-green-800" :
                        r.status === "draft" ? "bg-blue-100 text-blue-800" :
                        r.status === "approved" ? "bg-purple-100 text-purple-800" :
                        r.status === "generating" ? "bg-amber-100 text-amber-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 capitalize">{r.template}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {r.generated_at ? formatDistanceToNow(new Date(r.generated_at), { addSuffix: true }) : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {(r.delivery_channels as string[] ?? []).join(", ") || "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a href={`/reports/${r.id}`} className="text-sm text-blue-600 hover:underline">View</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
