"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:px-4 group-[.toaster]:py-3",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          success:
            "group-[.toaster]:bg-linear-to-br group-[.toaster]:from-emerald-500/20 group-[.toaster]:to-emerald-600/10 group-[.toaster]:border-emerald-500/50 group-[.toaster]:text-emerald-700 dark:group-[.toaster]:text-emerald-400!",
          error:
            "group-[.toaster]:bg-linear-to-br group-[.toaster]:from-destructive/20 group-[.toaster]:to-destructive/10 group-[.toaster]:border-destructive/50 group-[.toaster]:text-destructive",
          warning:
            "group-[.toaster]:bg-linear-to-br group-[.toaster]:from-yellow-500/20 group-[.toaster]:to-yellow-600/10 group-[.toaster]:border-yellow-500/50 group-[.toaster]:text-yellow-700 dark:group-[.toaster]:text-yellow-400!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
