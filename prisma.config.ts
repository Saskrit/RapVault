import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations use the direct (unpooled) URL. Runtime uses DATABASE_URL in src/lib/prisma.ts.
const migrationUrl =
  process.env["DIRECT_DATABASE_URL"] ?? process.env["DATABASE_URL"];

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationUrl,
  },
});
