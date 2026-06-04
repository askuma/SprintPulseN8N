"use client";
import { useQuery } from "@tanstack/react-query";
import { integrationsApi } from "@/lib/api";

const WORKSPACE_ID = process.env.NEXT_PUBLIC_DEMO_WORKSPACE_ID ?? "";

const INTEGRATION_LABELS: Record<string, string> = {
  jira: "Jira",
  github: "GitHub",
  slack: "Slack",
  google_calendar: "Google Calendar",
};

export default function SettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["integrations", WORKSPACE_ID],
    queryFn: () => integrationsApi.list(WORKSPACE_ID),
    enabled: !!WORKSPACE_ID,
  });

  const integrations = data?.data?.data ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">SprintPulse</h1>
          <nav className="flex gap-6 text-sm text-gray-600">
            <a href="/dashboard" className="hover:text-gray-900">Dashboard</a>
            <a href="/reports" className="hover:text-gray-900">Reports</a>
            <a href="/settings" className="text-blue-700 font-medium">Settings</a>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Settings</h2>
          <p className="text-sm text-gray-500">Manage integrations and workspace configuration.</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Integrations</h3>
            <p className="text-sm text-gray-500 mt-1">OAuth credentials are stored securely in n8n's encrypted vault — not in this application.</p>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading integrations...</div>
          ) : !WORKSPACE_ID ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 text-sm">Set <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_DEMO_WORKSPACE_ID</code> in your .env.local to manage integrations.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {(["jira", "github", "slack", "google_calendar"] as const).map((type) => {
                const integration = integrations.find((i) => i.type === type);
                return (
                  <div key={type} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{INTEGRATION_LABELS[type]}</p>
                      {integration ? (
                        <p className="text-sm text-gray-500 mt-0.5">
                          {integration.last_synced_at
                            ? `Last synced: ${new Date(integration.last_synced_at).toLocaleString()}`
                            : "Connected, never synced"}
                          {integration.last_error && <span className="ml-2 text-red-500">Error: {integration.last_error}</span>}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 mt-0.5">Not connected — configure in n8n credentials</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {integration && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          integration.status === "connected" ? "bg-green-100 text-green-800" :
                          integration.status === "error" ? "bg-red-100 text-red-800" :
                          integration.status === "syncing" ? "bg-blue-100 text-blue-800" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {integration.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">n8n Workflow Status</h3>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm text-gray-600 mb-3">Import workflow JSONs from <code className="bg-gray-100 px-1 rounded text-xs">apps/n8n-workflows/</code> into n8n to activate syncing.</p>
            <a
              href="http://localhost:5678"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Open n8n →
            </a>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-6 py-4">
          <p className="text-sm text-amber-800">
            <strong>Development note:</strong> This UI is a read-only dashboard for local development.
            Authentication (Auth0) is not wired up — API calls that require JWT will return 401.
            Set <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_DEMO_WORKSPACE_ID</code> in <code className="bg-amber-100 px-1 rounded">apps/web/.env.local</code> to a valid workspace UUID from the database to load real data.
          </p>
        </div>
      </main>
    </div>
  );
}
