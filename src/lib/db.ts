import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { databaseUrlComSchemaPrivado } from "./db-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const { semSchema, schema } = databaseUrlComSchemaPrivado();

  // O driver adapter nao le o ?schema= da URL, recebe a parte. Pool pequeno
  // porque o pooler do Supabase (modo sessao) tem poucas conexoes no plano
  // gratuito e cada instancia serverless da Vercel abre o proprio pool.
  const adapter = new PrismaPg({ connectionString: semSchema, max: 3 }, { schema });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Pro SQL escrito a mao, que nao recebe o schema do driver adapter.
export function tabela(nome: string) {
  return `"${databaseUrlComSchemaPrivado().schema}"."${nome}"`;
}
