"use client";

import { useEffect, useState } from "react";

export function CountdownProgress({ 
  initialCount = 20, 
  text = "Connecting..." 
}: { 
  initialCount?: number,
  text?: string
}) {
  const [count, setCount] = useState(initialCount);
  
  useEffect(() => {
    if (count <= 0) return;
    const t = setInterval(() => setCount(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [count]);

  const circumference = 2 * Math.PI * 10; 
  const strokeDashoffset = circumference - (count / initialCount) * circumference;

  return (
    <div className="flex items-center justify-between w-full mt-2">
      <span className="text-sm text-muted-foreground">{text}</span>
      <div className="relative flex items-center justify-center h-8 w-8">
        <svg className="h-full w-full transform -rotate-90">
          <circle
            className="text-muted stroke-current"
            strokeWidth="2"
            cx="16"
            cy="16"
            r="10"
            fill="transparent"
          />
          <circle
            className="text-primary stroke-current transition-all duration-1000 ease-linear"
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            cx="16"
            cy="16"
            r="10"
            fill="transparent"
          />
        </svg>
        <span className="absolute text-[10px] font-medium">{count}</span>
      </div>
    </div>
  );
}
