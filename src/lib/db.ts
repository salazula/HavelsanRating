import { PrismaClient } from "@prisma/client";
import { fillDbEnv } from "../../scripts/db-env.mjs";

fillDbEnv();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
