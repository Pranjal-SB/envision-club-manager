import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npm exec -- tsx prisma/seed.ts",
  },
  datasource: {
    /**
     * Migrations need one connection they can keep. Run them through a
     * transaction pooler and Migrate fails with `prepared statement "s0"
     * already exists`, because the pooler hands each statement whatever
     * connection is free.
     *
     * So the CLI gets DIRECT_URL and the running app keeps the pooled
     * DATABASE_URL it opens in src/lib/db.ts. Locally there is no pooler and
     * one URL does both jobs, which is what the fallback is for.
     */
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
