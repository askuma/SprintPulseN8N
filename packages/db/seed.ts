import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { workspaces, integrations } from "./src/schema/index";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function seed() {
  console.log("Seeding workspace...");

  // Insert demo workspace
  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: "Demo Workspace",
      slug: "demo",
      plan: "pro",
      monthly_report_quota: 20,
      reports_generated_this_month: 0,
      report_generation_enabled: true,
      default_timezone: "UTC",
      slack_channel_id: "#engineering",
      email_recipients: ["ashuthemaddy@gmail.com"],
      report_schedule_cron: "0 8 * * 5",
    })
    .onConflictDoNothing()
    .returning();

  if (!workspace) {
    console.log("Workspace already exists, fetching...");
    const existing = await db.select().from(workspaces).limit(1);
    if (existing.length === 0) {
      console.error("Could not create or find workspace");
      process.exit(1);
    }
    console.log("Workspace ID:", existing[0].id);
    await client.end();
    return;
  }

  console.log("Workspace created:", workspace.id);

  // Insert Jira integration (connected, with board ID and base URL in metadata)
  await db.insert(integrations).values({
    workspace_id: workspace.id,
    type: "jira",
    status: "connected",
    external_id: "1",          // replace with your real Jira board ID
    metadata: {
      base_url: "https://your-org.atlassian.net",  // replace with your Jira URL
      project_key: "PROJ",
    },
    scopes: ["read:jira-work", "read:sprint"],
  }).onConflictDoNothing();

  // Insert GitHub integration
  await db.insert(integrations).values({
    workspace_id: workspace.id,
    type: "github",
    status: "connected",
    external_id: "your-org/your-repo",  // replace with your repo
    metadata: { org: "your-org" },
    scopes: ["repo", "read:org"],
  }).onConflictDoNothing();

  // Insert Slack integration
  await db.insert(integrations).values({
    workspace_id: workspace.id,
    type: "slack",
    status: "connected",
    external_id: "T0123456789",  // replace with your Slack team ID
    metadata: { team_id: "T0123456789" },
    scopes: ["channels:history", "channels:read"],
  }).onConflictDoNothing();

  console.log("Integrations seeded.");
  console.log("\nWorkspace ID (copy this for NEXT_PUBLIC_DEMO_WORKSPACE_ID):", workspace.id);
  await client.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
