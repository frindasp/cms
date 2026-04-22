import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import mysql from 'mysql2/promise';
import pg from 'pg';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ queryId: string }> }
) {
  const { queryId } = await params;
  const session = await auth();
  if (!session) return ApiResponse.unauthorized();

  try {
    const query = await prisma.backupQuery.findUnique({
      where: { id: queryId },
      include: { backupConfig: true }
    });

    if (!query) return ApiResponse.error("Query not found", 404);

    return ApiResponse.success({ data: query });
  } catch (error: any) {
    return ApiResponse.internalError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ queryId: string }> }
) {
  const { queryId } = await params;
  const session = await auth();
  if (!session) return ApiResponse.unauthorized();

  try {
    const body = await request.json();
    const query = await prisma.backupQuery.update({
      where: { id: queryId },
      data: {
        name: body.name,
        description: body.description,
        sql: body.sql,
        schemaName: body.schemaName, // New field
      },
    });

    return ApiResponse.success({ data: query });
  } catch (error: any) {
    return ApiResponse.internalError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ queryId: string }> }
) {
  const { queryId } = await params;
  const session = await auth();
  if (!session) return ApiResponse.unauthorized();

  try {
    const query = await prisma.backupQuery.delete({
      where: { id: queryId },
    });

    return ApiResponse.success({ message: `Query ${query.name} deleted successfully` });
  } catch (error: any) {
    return ApiResponse.internalError(error);
  }
}

// Separate endpoint for execution might be better, but I'll add a POST to this route or similar.
// Let's use /api/backup/query/[queryId]/execute for execution.
