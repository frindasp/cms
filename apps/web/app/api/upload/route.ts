import { NextResponse } from "next/server";
import { auth } from "@/auth";
import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.IMAGEKIT_URL!,
});

// GET — return auth params for client-side upload
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authParams = imagekit.getAuthenticationParameters();
  return NextResponse.json(authParams);
}

// POST — server-side upload (base64)
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { file, fileName, folder = "/portfolio" } = body;

  if (!file || !fileName) {
    return NextResponse.json({ error: "file and fileName required" }, { status: 400 });
  }

  try {
    const result = await imagekit.upload({
      file,
      fileName,
      folder,
      useUniqueFileName: true,
    });
    return NextResponse.json({
      url: result.url,
      fileId: result.fileId,
      name: result.name,
      thumbnailUrl: result.thumbnailUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
