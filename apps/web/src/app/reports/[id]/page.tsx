"use client";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { use } from "react";

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["report", id],
    queryFn: () => reportsApi.get(id),
  });

  const report = data?.data?.data;

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Loading report...</p>
    </div>
  );

  if (isError || !report) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-700 font-medium mb-2">Report not found</p>
        <a href="/reports" className="text-sm text-blue-600 hover:underline">← Back to reports</a>
      </div>
    </div>
  );

  const content = report.content as Record<string, unknown> | null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <a href="/reports" className="text-sm text-gray-500 hover:text-gray-700">← Reports</a>
            <h1 className="text-xl font-semibold text-gray-900 mt-1">{report.sprint_name}</h1>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            report.status === "sent" ? "bg-green-100 text-green-800" :
            report.status === "draft" ? "bg-blue-100 text-blue-800" :
            report.status === "approved" ? "bg-purple-100 text-purple-800" :
            report.status === "generating" ? "bg-amber-100 text-amber-800" :
            "bg-red-100 text-red-800"
          }`}>
            {report.status}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-gray-500">Report ID</dt><dd className="font-mono text-gray-900 mt-1">{report.id}</dd></div>
            <div><dt className="text-gray-500">Template</dt><dd className="capitalize text-gray-900 mt-1">{report.template}</dd></div>
            <div><dt className="text-gray-500">Generated</dt><dd className="text-gray-900 mt-1">{report.generated_at ? formatDistanceToNow(new Date(report.generated_at), { addSuffix: true }) : "—"}</dd></div>
            <div><dt className="text-gray-500">Delivery channels</dt><dd className="text-gray-900 mt-1">{(report.delivery_channels as string[] ?? []).join(", ") || "—"}</dd></div>
          </dl>
        </div>

        {content ? (
          <>
            {content.executive_digest && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-3">Executive Digest</h2>
                <p className="text-gray-700 text-sm leading-relaxed">{String(content.executive_digest)}</p>
              </div>
            )}
            {content.sprint_summary && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-3">Sprint Summary</h2>
                <p className="text-gray-700 text-sm leading-relaxed">{String(content.sprint_summary)}</p>
              </div>
            )}
            {content.metrics_narrative && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-3">Metrics</h2>
                <p className="text-gray-700 text-sm leading-relaxed">{String(content.metrics_narrative)}</p>
              </div>
            )}
            {Array.isArray(content.blockers_and_risks) && content.blockers_and_risks.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-3">Blockers & Risks</h2>
                <ul className="space-y-2">
                  {(content.blockers_and_risks as Array<Record<string, string>>).map((b, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${b.severity === "high" ? "bg-red-500" : b.severity === "medium" ? "bg-amber-400" : "bg-green-500"}`} />
                      <span className="text-gray-700">{b.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(content.action_items) && content.action_items.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-3">Action Items</h2>
                <ul className="space-y-2">
                  {(content.action_items as Array<Record<string, string>>).map((a, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-gray-400 flex-shrink-0">•</span>
                      <span>{a.action} {a.owner ? <span className="text-gray-500">— {a.owner}</span> : null}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500">
              {report.status === "generating" ? "Report is being generated by Claude…" : "No content available yet."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
