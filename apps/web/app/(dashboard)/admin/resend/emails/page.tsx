"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { RefreshCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";

type SentEmail = {
  id: string;
  to: string[];
  from: string;
  created_at: string;
  subject: string;
  last_event: string;
};

export default function SentEmailsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSyncOpen, setIsSyncOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["sent-emails"],
    queryFn: async () => {
      const res = await fetch(`/api/resend/emails`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch sent emails");
      }
      return res.json();
    },
  });

  const filteredData = (data?.data || []).filter((email: SentEmail) => {
    if (!startDate && !endDate) return true;
    const emailDate = new Date(email.created_at).getTime();
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).getTime() : Infinity;
    // adding one day to end date to include the whole day
    return emailDate >= start && emailDate <= end + 86400000;
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      // Dummy sync API call to equate Resend with local DB
      const res = await fetch("/api/resend/emails/sync", {
        method: "POST",
        body: JSON.stringify({ startDate, endDate }),
      });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: () => {
      setIsSyncOpen(false);
      alert("Sync completed successfully!");
    }
  });

  const handleOpenSync = () => {
    setIsSyncOpen(true);
  };

  const columns: ColumnDef<SentEmail>[] = [
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {row.getValue("subject")}
        </span>
      ),
    },
    {
      accessorKey: "to",
      header: "Recipient",
      cell: ({ row }) => {
        const to: string[] = row.getValue("to");
        return (
          <div className="flex flex-wrap gap-1">
            {to?.map((email) => (
              <span key={email} className="text-sm text-primary">
                {email}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "from",
      header: "Sender",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.getValue("from")}
        </span>
      ),
    },
    {
      accessorKey: "last_event",
      header: "Status",
      cell: ({ row }) => {
        const status: string = row.getValue("last_event");
        const getVariant = (s: string) => {
          switch (s) {
            case "delivered": return "default";
            case "opened": return "secondary";
            case "bounced": 
            case "failed": return "destructive";
            default: return "outline";
          }
        };

        return (
          <Badge variant={getVariant(status)} className="capitalize">
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Sent At",
      cell: ({ row }) => new Date(row.getValue("created_at")).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sent Emails</h1>
          <p className="text-muted-foreground">
            View all emails sent out via your Resend API.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
          <Input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full sm:w-auto"
          />
          <span className="text-muted-foreground hidden sm:inline">-</span>
          <Input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full sm:w-auto"
          />
          <Button onClick={handleOpenSync} className="w-full sm:w-auto whitespace-nowrap">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Check & Sync
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive font-medium border border-destructive/20">
          Error: {(error as Error).message}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          pageIndex={1}
          pageSize={filteredData.length || 10}
          totalCount={filteredData.length || 0}
          onPageChange={() => {}}
          isLoading={isLoading}
        />
      )}

      <Dialog open={isSyncOpen} onOpenChange={setIsSyncOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync Resend Emails with Database</DialogTitle>
            <DialogDescription>
              We found differences between Resend's Sent Emails API and your local Database for the selected date range. Do you want to synchronize them now?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              By syncing, missing emails from Resend will be stored in your database to ensure data parity.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSyncOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => syncMutation.mutate()} 
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? "Syncing..." : "Sync Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
