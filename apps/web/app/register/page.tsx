"use client";

import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";

export default function RegisterPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Daftar Akun Admin</CardTitle>
          <CardDescription>
            Verifikasi pendaftaran menggunakan OTP yang diberikan langsung oleh admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Silakan hubungi admin untuk meminta OTP verifikasi sebelum akun bisa diaktifkan.
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href="mailto:admin@admin.com?subject=Permintaan%20OTP%20Verifikasi">
              Minta OTP ke Admin
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Kembali ke Login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
