import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

export async function GET() {
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

    return ApiResponse.success({
      data: emails,
    });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
