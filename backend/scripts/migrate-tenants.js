const db = require("../config/db");
const fs = require("fs");
const path = require("path");

(async () => {
  const client = await db.pool.connect();

  try {
    const { rows: tenants } = await client.query(
      "SELECT schema_name FROM public.tenants"
    );

    const schemaSqlPath = path.join(__dirname, "../db/tenant_schema.sql");
    const baseSql = fs.readFileSync(schemaSqlPath, "utf8");

    for (const t of tenants) {
      const schema = t.schema_name;
      console.log("Migrating", schema);

      const sql = baseSql.replace(/__SCHEMA__/g, schema);
      await client.query(sql);
    }

    console.log("All tenants migrated successfully");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    client.release();
    process.exit(0);
  }
})();
