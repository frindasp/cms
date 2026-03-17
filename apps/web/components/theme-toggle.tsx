"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full border-2 bg-background/80 shadow-lg backdrop-blur-md transition-all hover:scale-110 active:scale-95"
          >
            <Sun className="h-[1.5rem] w-[1.5rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.5rem] w-[1.5rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="mb-2 min-w-[8rem] rounded-xl border-2 bg-background/90 backdrop-blur-md">
          <DropdownMenuItem 
            onClick={() => setTheme("light")}
            className="flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 transition-colors hover:bg-muted"
          >
            <Sun className="h-4 w-4" />
            <span>Light</span>
            {theme === "light" && <div className="ml-auto h-2 w-2 rounded-full bg-primary" />}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setTheme("dark")}
            className="flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 transition-colors hover:bg-muted"
          >
            <Moon className="h-4 w-4" />
            <span>Dark</span>
            {theme === "dark" && <div className="ml-auto h-2 w-2 rounded-full bg-primary" />}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setTheme("system")}
            className="flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 transition-colors hover:bg-muted"
          >
            <Monitor className="h-4 w-4" />
            <span>System</span>
            {theme === "system" && <div className="ml-auto h-2 w-2 rounded-full bg-primary" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
