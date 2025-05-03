import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from '@supabase/supabase-js';
import { compare } from "bcryptjs";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUserByEmail(email: string) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
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
    } catch (err) {
        console.error('Exception in getUserByEmail:', err);
        return null;
    }
}

// Test DB Connection
const testSupabase = async () => {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error } = await supabase.from('users').select('count');
        if (error) {
            console.error("Supabase connection test failed:", error);
            return false;
        }
        console.log("Supabase connection test succeeded. User count:", data);
        return true;
    } catch (e) {
        console.error("Supabase connection error:", e);
        return false;
    }
};

// Test the connection immediately
testSupabase();

export const authOptions: AuthOptions = {
    // Remove the adapter for now to simplify our approach
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

                try {
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
                } catch (err) {
                    console.error("Error in password comparison:", err);
                    throw new Error("Authentication error");
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            console.log("Sign in callback for user:", user.email, "with account provider:", account?.provider);

            try {
                if (account?.provider === 'google') {
                    const supabase = createClient(supabaseUrl, supabaseServiceKey);

                    // Check if user exists
                    const { data: existingUser, error: userError } = await supabase
                        .from('users')
                        .select('id, tier')
                        .eq('email', user.email)
                        .single();

                    if (userError && userError.code !== 'PGRST116') { // Not "No rows found"
                        console.error('Error checking existing user:', userError);
                    }

                    if (!existingUser) {
                        // Create new user
                        console.log("Creating new user with email:", user.email);
                        const { data, error } = await supabase
                            .from('users')
                            .insert({
                                email: user.email,
                                name: user.name,
                                tier: 'free',
                                created_at: new Date().toISOString(),
                            })
                            .select('id, tier')
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
                return true; // Still allow sign in even if there's an error
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
        strategy: "jwt", // Use JWT strategy - simpler and more reliable for our needs
        maxAge: 30 * 24 * 60 * 60,
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === "development",
};