import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { logActivity } from "@/lib/activity-log";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true, UserImage: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { password: _, ...sanitizedUser } = user;
    return NextResponse.json(sanitizedUser);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, password, roleId, avatarUrl } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (roleId !== undefined) data.roleId = roleId;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    if (avatarUrl !== undefined) {
      if (avatarUrl) {
        await prisma.userImage.upsert({
          where: { userId: id },
          update: { imageUrl: avatarUrl, source: "imagekit" },
          create: {
            id: `usr-img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            userId: id,
            imageUrl: avatarUrl,
            source: "imagekit",
          },
        });
      } else {
        await prisma.userImage.deleteMany({
          where: { userId: id },
        });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      include: { role: true, UserImage: true },
    });

    const { password: _, ...sanitizedUser } = user;

    await logActivity({
      userId: session.user?.id,
      action: "UPDATE_USER",
      description: `Updated user ${user.email}`,
      route: `/api/users/${id}`,
      method: "PATCH",
    });

    return NextResponse.json(sanitizedUser);
  } catch (error: any) {
    console.error("Update user error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if it's the last admin or something? 
    // For now simple delete
    await prisma.user.delete({
      where: { id },
    });

    await logActivity({
      userId: session.user?.id,
      action: "DELETE_USER",
      description: `Deleted user with ID ${id}`,
      route: `/api/users/${id}`,
      method: "DELETE",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
