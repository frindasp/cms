import { prisma } from "@workspace/database";

async function main() {
  const [conversations, messages, contacts] = await Promise.all([
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.contact.count(),
  ]);
  console.log(JSON.stringify({ conversations, messages, contacts }, null, 2));
}

main().catch(console.error);
