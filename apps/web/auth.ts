import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@workspace/database"
import * as bcrypt from "bcryptjs"

export const authConfig = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const users = await prisma.user.findMany({
          where: { 
            email: credentials.email as string,
            role: { name: { in: ["ADMIN", "Admin"] } },
          },
          include: { role: true, UserImage: true },
        })

        if (!users || users.length === 0) return null

        for (const user of users) {
            const isValidPassword = await bcrypt.compare(
                credentials.password as string,
                user.password
            )
            if (isValidPassword) {
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role.name,
                    image: user.UserImage?.imageUrl || null,
                }
            }
        }

        return null
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }: any) {
      const isLoggedIn = !!auth?.user
      const userRole = (auth?.user as any)?.role?.toUpperCase?.()
      const isAdmin = userRole === "ADMIN"
      const isOnAdmin = nextUrl.pathname.startsWith("/admin")

      if (isOnAdmin) {
        if (isLoggedIn && isAdmin) return true
        return false // Redirects automatically to pages.signIn with callbackUrl
      }
      return true
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
        token.picture = (user as any).image
      }
      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        ;(session.user as any).id = token.id || token.sub
        ;(session.user as any).role = token.role
        if (token.picture) {
          session.user.image = token.picture
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig) as any
