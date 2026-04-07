import "dotenv/config";
import { prisma } from "./packages/database/index.ts";

async function main() {
  console.log("Starting data migration for Conversations...");

  // 1. Get all messages that don't have a conversationId
  const messages = await prisma.message.findMany({
    where: { conversationId: null },
    include: { contact: true }
  });

  console.log(`Found ${messages.length} messages to process.`);

  for (const msg of messages) {
    const email = msg.contact?.email || msg.senderEmail;
    if (!email) continue;

    // Create or find conversation
    let conv = await prisma.conversation.findUnique({
      where: { email }
    });

    if (!conv) {
      conv = await prisma.conversation.create({
        data: {
          email,
          name: msg.contact?.name || email.split("@")[0],
          createdAt: msg.createdAt,
          updatedAt: msg.createdAt,
        }
      });
    }

    // Link message to conversation
    await prisma.message.update({
      where: { id: msg.id },
      data: { conversationId: conv.id }
    });
  }

  // 2. Process all contacts that might not have messages yet
  const contacts = await prisma.contact.findMany();
  console.log(`Found ${contacts.length} contacts to process.`);

  for (const contact of contacts) {
    let conv = await prisma.conversation.findUnique({
      where: { email: contact.email }
    });

    if (!conv) {
        conv = await prisma.conversation.create({
            data: {
                email: contact.email,
                name: contact.name,
                createdAt: contact.createdAt,
                updatedAt: contact.createdAt,
            }
        });
    }

    // Link all messages for this contact to the conversation if not done
    await prisma.message.updateMany({
        where: { contactId: contact.id, conversationId: null },
        data: { conversationId: conv.id }
    });
  }

  console.log("Migration completed.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
