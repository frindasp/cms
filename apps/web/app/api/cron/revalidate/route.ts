import { NextResponse } from "next/server"

/**
 * Vercel Cron Job — runs daily at midnight UTC.
 * Triggers revalidation of the portfolio experience pages so that
 * auto-computed period labels (e.g. "Saat ini · X bln") stay fresh
 * without needing to redeploy.
 *
 * Configure in vercel.json:
 * { "crons": [{ "path": "/api/cron/revalidate", "schedule": "0 0 * * *" }] }
 *
 * Secure with CRON_SECRET env var — Vercel injects the Authorization header.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Revalidate all portfolio pages that show experience data
    const paths = [
      "/",
      "/about",
      "/experiences",
    ]

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? (
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3026"
    )

    const results = await Promise.allSettled(
      paths.map((path) =>
        fetch(`${baseUrl}/api/revalidate?path=${encodeURIComponent(path)}`, {
          headers: { "x-revalidate-token": process.env.REVALIDATE_TOKEN ?? "" },
        })
      )
    )

    const summary = results.map((r, i) => ({
      path: paths[i],
      status: r.status,
    }))

    console.log("[cron/revalidate]", summary)
    return NextResponse.json({ ok: true, revalidated: summary, timestamp: new Date().toISOString() })
  } catch (err: any) {
    console.error("[cron/revalidate] error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
