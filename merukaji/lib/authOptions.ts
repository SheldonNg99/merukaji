import { SupabaseAdapter } from "@auth/supabase-adapter";
import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from '@supabase/supabase-js';
import { compare } from "bcryptjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUserByEmail(email: string) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error) {
        console.error('Error fetching user:', error);
        return null;
    }

    return data;
}

export const authOptions: AuthOptions = {
    adapter: SupabaseAdapter({
        url: supabaseUrl,
        secret: supabaseServiceKey,
    }),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            }
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
                    id: user.id.toString(),
                    email: user.email,
                    name: user.name,
                    tier: user.tier || 'free',
                };
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            try {
                if (account?.provider === 'google') {
                    const supabase = createClient(supabaseUrl, supabaseServiceKey);

                    // Check if user exists
                    const { data: existingUser } = await supabase
                        .from('users')
                        .select('*')
                        .eq('email', user.email)
                        .single();

                    if (!existingUser) {
                        // Create new user
                        const { data, error } = await supabase
                            .from('users')
                            .insert({
                                email: user.email,
                                name: user.name,
                                tier: 'free',
                                created_at: new Date().toISOString(),
                            })
                            .select()
                            .single();

                        if (error) {
                            console.error('Error creating user:', error);
                            return false;
                        }

                        user.id = data.id;
                        user.tier = data.tier;
                    } else {
                        user.id = existingUser.id;
                        user.tier = existingUser.tier;
                    }
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