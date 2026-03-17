import { NextResponse } from "next/server";

export class ApiResponse {
  static success<T>(data: T, status = 200) {
    return NextResponse.json(data, { status });
  }

  static error(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
  }

  static unauthorized() {
    return this.error("Unauthorized", 401);
  }

  static internalError(error?: any) {
    if (error) console.error("Internal Server Error:", error);
    return this.error("Internal Server Error", 500);
  }
}
