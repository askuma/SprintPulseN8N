import postgres from "postgres";
import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function run() {
  const client = postgres(process.env.DATABASE_URL!);
  const rows = await client`SELECT sprint_id, sprint_name, tickets_completed, tickets_in_progress, tickets_blocked FROM sprint_data`;
  console.log(JSON.stringify(rows[0], null, 2));
  await client.end();
}
run().catch(console.error);
