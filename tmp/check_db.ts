import { prisma } from "./packages/database";

async function main() {
  const count = await prisma.contact.count();
  const latest = await prisma.contact.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  });
  console.log("Count:", count);
  console.log("Latest:", JSON.stringify(latest, null, 2));
}

main();
