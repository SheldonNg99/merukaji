import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { compare } from "bcryptjs";

async function getUserByEmail(email: string) {
    const client = await clientPromise;
    const db = client.db();
    return await db.collection('users').findOne({ email });
}

export const authOptions: AuthOptions = {
    adapter: MongoDBAdapter(clientPromise),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required");
                }

                const user = await getUserByEmail(credentials.email);
                if (!user) {
                    throw new Error("No user found");
                }

                const isValid = await compare(credentials.password, user.password);
                if (!isValid) {
                    throw new Error("Invalid password");
                }

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    tier: user.tier || 'free',
                };
            },
        }),
    ],
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
        callbackUrl: {
            name: `next-auth.callback-url`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
        csrfToken: {
            name: `next-auth.csrf-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
        state: {
            name: `next-auth.state`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
                maxAge: 900,
            },
        },
    },
    callbacks: {
        async signIn({ user, account }) {
            try {
                if (account?.provider === 'google') {
                    const client = await clientPromise;
                    const db = client.db();

                    let dbUser = await db.collection('users').findOne({ email: user.email });

                    if (!dbUser) {
                        const result = await db.collection('users').insertOne({
                            email: user.email,
                            name: user.name,
                            tier: 'free',
                            createdAt: new Date(),
                        });

                        dbUser = {
                            _id: result.insertedId,
                            email: user.email,
                            name: user.name,
                            tier: 'free',
                        };
                    }
                    user.id = dbUser._id.toString();
                    user.tier = dbUser.tier;
                }
                return true;
            } catch (error) {
                console.error("SignIn callback error:", error);
                return true;
            }
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
                token.tier = user.tier || 'free';
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.tier = (token.tier as string) || 'free';
                session.user.email = token.email as string;
                session.user.name = token.name as string;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
