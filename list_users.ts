import "dotenv/config";
import { prisma } from "./packages/database/index.ts";

async function main() {
  const users = await prisma.user.findMany({
    include: { role: true }
  });
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
