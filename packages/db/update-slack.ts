import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { workspaces } from "./src/schema/index";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const SLACK_CHANNEL_ID = process.argv[2];
if (!SLACK_CHANNEL_ID) {
  console.error("Usage: npx tsx update-slack.ts <CHANNEL_ID>");
  console.error("Example: npx tsx update-slack.ts C06ABCDEF12");
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function run() {
  const result = await db.update(workspaces)
    .set({ slack_channel_id: SLACK_CHANNEL_ID })
    .where(eq(workspaces.id, "14bb35bd-9e7b-45d6-a3f5-9854d21da1c0"))
    .returning();

  console.log("Updated:", result.length, "row(s)");
  console.log("Slack channel ID set to:", SLACK_CHANNEL_ID);
  await client.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
