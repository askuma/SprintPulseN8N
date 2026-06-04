export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md w-full text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">SprintPulse</h1>
        <p className="text-gray-500 text-sm mb-6">
          Auth0 authentication is not configured for local development.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left text-sm text-amber-800">
          <p className="font-medium mb-2">Local dev — skip login</p>
          <p>API endpoints that require JWT will return empty data. The n8n sync workflows and the database work without authentication.</p>
          <p className="mt-2">
            Navigate directly to{" "}
            <a href="/dashboard" className="underline font-medium">Dashboard</a>,{" "}
            <a href="/reports" className="underline font-medium">Reports</a>, or{" "}
            <a href="/settings" className="underline font-medium">Settings</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
