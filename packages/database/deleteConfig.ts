import 'dotenv/config';
import { prisma } from "./index";

async function main() {
  const configs = await prisma.backupConfig.findMany();
  for (const config of configs) {
    if (config.databaseType !== 'TIDB' && config.databaseType !== 'SUPABASE') {
      console.log('Deleting config:', config.name, config.databaseType);
      await prisma.backupConfig.delete({ where: { id: config.id } });
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
