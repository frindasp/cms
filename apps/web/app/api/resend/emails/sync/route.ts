import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import { prisma } from "@workspace/database";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  try {
    if (!process.env.RESEND_API_KEY) {
      return ApiResponse.error("Resend API key is not configured.", 400);
    }
    
    // Fetch from Resend Emails API
    const response = await resend.emails.list();

    if (response.error) {
      return ApiResponse.error(response.error.message || "Failed to fetch emails", 400);
    }

    // Extract the emails array
    const emails = (response.data as any)?.data || [];

    let count = 0;
    
    // Save to the WebhookEmail table as requested to keep sent/received aligned for now
    for (const email of emails) {
      const existing = await prisma.webhookEmail.findUnique({
        where: { id: email.id }
      });
      
      if (!existing) {
        await prisma.webhookEmail.create({
          data: {
            id: email.id,
            from: email.from,
            to: Array.isArray(email.to) ? email.to.join(", ") : email.to,
            subject: email.subject,
            rawData: email,
            createdAt: new Date(email.created_at)
          }
        });
        count++;
      }
    }

    return ApiResponse.success({
      message: `Synced ${count} new emails successfully.`,
      syncedCount: count,
    });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
