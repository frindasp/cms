import "@workspace/ui/globals.css"
import { Providers } from "@/components/providers"
import { cn } from "@workspace/ui/lib/utils";

import { Toaster } from "@workspace/ui/components/sonner";
import { ThemeToggle } from "@/components/theme-toggle";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", "font-sans")}
      style={
        {
          "--font-sans":
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          "--font-mono":
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        } as React.CSSProperties
      }
    >
      <body>
        <Providers>
          {children}
          <ThemeToggle />
          <Toaster position="top-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  )
}
