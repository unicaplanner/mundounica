import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { databaseUrlComSchemaPrivado } from "./src/lib/db-url";

// O Next.js le .env.local sozinho em runtime; o CLI do Prisma so le .env por
// padrao, entao carregamos .env.local manualmente aqui tambem.
config({ path: ".env.local", quiet: true });
config({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrlComSchemaPrivado().completa,
  },
});
