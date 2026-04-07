import { prisma } from "@workspace/database";
import { headers } from "next/headers";
import { userAgent as getUserAgent } from "next/server";

export type ActivityAction = 
  | "LOGIN"
  | "LOGOUT"
  | "CREATE_USER"
  | "UPDATE_USER"
  | "DELETE_USER"
  | "UPDATE_CONTACT"
  | "DELETE_CONTACT"
  | "SEND_EMAIL"
  | "MFA_ENABLED"
  | "MFA_DISABLED"
  | "SECURITY_KEY_ADDED"
  | "SECURITY_KEY_REMOVED";

export async function logActivity({
  userId,
  action,
  description,
  metadata,
  route,
  method,
}: {
  userId?: string;
  action: ActivityAction | string;
  description?: string;
  metadata?: any;
  route?: string;
  method?: string;
}) {
  try {
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const userAgentStr = headerList.get("user-agent") || "";
    const { device } = getUserAgent({ headers: headerList });

    await prisma.historyActivityUser.create({
      data: {
        id: crypto.randomUUID(),
        userId: userId || null,
        action,
        description,
        route,
        method,
        ipAddress: ip,
        userAgent: userAgentStr,
        deviceType: device.type || "desktop",
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
