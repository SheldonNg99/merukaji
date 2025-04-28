import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

export const authOptions: AuthOptions = {
    adapter: MongoDBAdapter(clientPromise),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password required");
                }

                const client = await clientPromise;
                const db = client.db();
                const user = await db.collection("users").findOne({ email: credentials.email });

                if (!user || !user.password) {
                    throw new Error("No user found with this email");
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    throw new Error("Invalid password");
                }

                // Return user object with required fields
                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name || "",
                    tier: user.tier || "free"
                };
            },
        }),
    ],
    callbacks: {
        // Fix JWT callback to include user data
        async jwt({ token, user }) {
            if (user) {
                // Use type assertion to handle the TypeScript error
                token.id = user.id as string;
                token.email = user.email as string;
                token.name = user.name as string;
                token.tier = (user.tier as string) || "free";
            }
            return token;
        },
        // Fix session callback to use token data
        async session({ session, token }: { session: Session; token: JWT }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.tier = (token.tier as string) || "free";
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    session: {
        strategy: "jwt", // This is important for credentials provider
    },
    secret: process.env.NEXTAUTH_SECRET, // Make sure this is set in your .env
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };