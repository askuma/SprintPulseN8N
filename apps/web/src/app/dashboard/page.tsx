"use client";
import { useQuery } from "@tanstack/react-query";
import { reportsApi, integrationsApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

const WORKSPACE_ID = process.env.NEXT_PUBLIC_DEMO_WORKSPACE_ID ?? "";

export default function DashboardPage() {
  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ["reports", WORKSPACE_ID],
    queryFn: () => reportsApi.list(WORKSPACE_ID),
    enabled: !!WORKSPACE_ID,
  });

  const { data: integrationsData } = useQuery({
    queryKey: ["integrations", WORKSPACE_ID],
    queryFn: () => integrationsApi.list(WORKSPACE_ID),
    enabled: !!WORKSPACE_ID,
  });

  const reports = reportsData?.data?.reports ?? [];
  const integrations = integrationsData?.data?.data ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">SprintPulse</h1>
          <nav className="flex gap-6 text-sm text-gray-600">
            <a href="/dashboard" className="text-blue-700 font-medium">Dashboard</a>
            <a href="/reports" className="hover:text-gray-900">Reports</a>
            <a href="/settings" className="hover:text-gray-900">Settings</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {integrations.map(i => (
            <div key={i.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${i.status === "connected" ? "bg-green-500" : i.status === "error" ? "bg-red-500" : "bg-amber-400"}`} />
                <span className="text-sm font-medium capitalize">{i.type?.replace("_", " ")}</span>
              </div>
              <p className="text-xs text-gray-500">
                {i.last_synced_at ? `Synced ${formatDistanceToNow(new Date(i.last_synced_at))} ago` : "Never synced"}
              </p>
            </div>
          ))}
          {integrations.length === 0 && (
            <div className="col-span-4 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <p className="text-blue-800 font-medium mb-2">No integrations connected</p>
              <a href="/settings" className="text-sm text-blue-600 underline">Connect Jira, GitHub, Slack, and Calendar to get started</a>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Reports</h2>
            <a href="/reports" className="text-sm text-blue-600 hover:underline">View all</a>
          </div>

          {reportsLoading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 mb-4">No reports yet.</p>
              <p className="text-sm text-gray-400">Reports are generated automatically every Friday at 08:00, or you can trigger one manually.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Sprint</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Generated</th>
                  <th className="text-left px-6 py-3">Delivered via</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{r.sprint_name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === "sent" ? "bg-green-100 text-green-800" :
                        r.status === "draft" ? "bg-blue-100 text-blue-800" :
                        r.status === "generating" ? "bg-amber-100 text-amber-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {r.status}
                      </span>
                    </td>
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
