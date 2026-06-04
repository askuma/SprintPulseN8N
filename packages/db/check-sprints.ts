import postgres from "postgres";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const client = postgres(process.env.DATABASE_URL!);

async function run() {
  const rows = await client`
    SELECT sprint_id, sprint_name, state, burndown_percent, synced_at
    FROM sprint_data
    ORDER BY synced_at DESC
    LIMIT 5
  `;
  if (rows.length === 0) {
    console.log("No sprint data found yet.");
  } else {
    console.table(rows);
  }
  await client.end();
}

run().catch(console.error);
