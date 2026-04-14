import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const config = await prisma.backupConfig.findFirst({
    where: {
      databaseType: 'MONGODB'
    }
  });
  console.log(JSON.stringify(config, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
