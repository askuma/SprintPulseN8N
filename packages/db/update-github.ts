import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { integrations } from "./src/schema/index";
import { eq, and } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function run() {
  const result = await db.update(integrations)
    .set({
      external_id: "askuma/SprintPulseN8N",
      metadata: { org: "askuma" },
    })
    .where(
      and(
        eq(integrations.type, "github"),
        eq(integrations.workspace_id, "14bb35bd-9e7b-45d6-a3f5-9854d21da1c0")
      )
    )
    .returning();

  console.log("Updated:", result.length, "row(s)");
  console.log("GitHub repo set to: askuma/SprintPulseN8N");
  await client.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
