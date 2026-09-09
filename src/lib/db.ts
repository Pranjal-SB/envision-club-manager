import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

// Prisma 7 has no Rust query engine; the connection goes through a driver adapter.
const makeClient = () => new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Next's dev server re-evaluates modules on every change. Without this the
// connection pool grows until Postgres refuses new clients.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof makeClient> };

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
