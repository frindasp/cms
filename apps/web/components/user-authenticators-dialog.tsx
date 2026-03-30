"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { ShieldCheck, Monitor, Smartphone, Shield } from "lucide-react";

type Authenticator = {
  id: string;
  credentialID: string;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  transports: string | null;
};

interface UserAuthenticatorsDialogProps {
  userId: string | null;
  userName: string | null;
  onClose: () => void;
}

export function UserAuthenticatorsDialog({
  userId,
  userName,
  onClose,
}: UserAuthenticatorsDialogProps) {
  const { data: authenticators, isLoading } = useQuery<Authenticator[]>({
    queryKey: ["user-authenticators", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`/api/users/${userId}/authenticators`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!userId,
  });

  return (
    <Dialog open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Security Keys - {userName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 text-center">Loading authenticators...</div>
        ) : (authenticators?.length || 0) === 0 ? (
          <div className="py-10 text-center text-muted-foreground bg-muted/50 rounded-lg border border-dashed">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-20" />
            No Passkeys/Authenticators found for this user.
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Credential ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transports</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {authenticators?.map((auth) => (
                  <TableRow key={auth.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {auth.credentialDeviceType === "single_device" ? (
                          <Smartphone className="h-4 w-4" />
                        ) : (
                          <Monitor className="h-4 w-4" />
                        )}
                        <span className="capitalize">
                          {auth.credentialDeviceType.replace("_", " ")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs">
                      {auth.credentialID}
                    </TableCell>
                    <TableCell>
                      {auth.credentialBackedUp ? (
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                          Backed Up
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10">
                          Local Only
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {auth.transports?.split(",").map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px] uppercase">
                            {t}
                          </Badge>
                        )) || "-"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
