// lib/authOptions.ts
import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from '@supabase/supabase-js';
import { compare } from "bcryptjs";
import { recordFailedAttempt, resetLoginAttempts, checkLoginAttempts } from "./authLockout";
import { logger } from "./logger";

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
            logger.error('Error fetching user by email:', {
                email,
                error: error.message,
                code: error.code
            });
            return null;
        }

        return data;
    } catch (err) {
        logger.error('Exception in getUserByEmail:', {
            email,
            error: err instanceof Error ? err.message : String(err)
        });
        return null;
    }
}

// Test DB Connection
const testSupabase = async () => {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error } = await supabase.from('users').select('count');
        if (error) {
            logger.error("Supabase connection test failed:", { error: error.message, code: error.code });
            return false;
        }
        logger.info("Supabase connection test succeeded.", { userCount: data });
        return true;
    } catch (e) {
        logger.error("Supabase connection error:", {
            error: e instanceof Error ? e.message : String(e)
        });
        return false;
    }
};

// Test the connection immediately
testSupabase();

export const authOptions: AuthOptions = {
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

                if (!(await checkLoginAttempts(credentials.email))) {
                    throw new Error("Account is temporarily locked due to too many failed attempts. Try again later.");
                }

                const user = await getUserByEmail(credentials.email);

                if (!user) {
                    await recordFailedAttempt(credentials.email);
                    throw new Error("Invalid email or password");
                }

                try {
                    const isValid = await compare(credentials.password, user.password);
                    if (!isValid) {
                        await recordFailedAttempt(credentials.email);
                        throw new Error("Invalid email or password");
                    }

                    await resetLoginAttempts(credentials.email);

                    return {
                        id: user.id.toString(),
                        email: user.email,
                        name: user.name,
                        credit_balance: user.credit_balance,
                        free_tier_used: user.free_tier_used,
                        last_credit_reset: user.last_credit_reset
                    };
                } catch (error) {
                    await recordFailedAttempt(credentials.email);
                    logger.error("Authentication error:", {
                        email: credentials.email,
                        error: error instanceof Error ? error.message : String(error)
                    });
                    throw new Error("Authentication error");
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            logger.info("Sign in callback initiated", {
                email: user.email,
                provider: account?.provider
            });

            try {
                if (account?.provider === 'google') {
                    const supabase = createClient(supabaseUrl, supabaseServiceKey);

                    // Check if user exists
                    const { data: existingUser, error: userError } = await supabase
                        .from('users')
                        .select('id, credit_balance, free_tier_used, last_credit_reset')
                        .eq('email', user.email)
                        .single();

                    if (userError) {
                        if (userError.code === 'PGRST116') { // "No rows found"
                            logger.info('Creating new user account for Google auth', { email: user.email });

                            // Create new user with proper defaults
                            const { data, error } = await supabase
                                .from('users')
                                .insert({
                                    email: user.email,
                                    name: user.name,
                                    credit_balance: 0, // Will be set to 3 by credit system
                                    free_tier_used: false,
                                    created_at: new Date().toISOString(),
                                })
                                .select('id, credit_balance, free_tier_used, last_credit_reset')
                                .single();

                            if (error) {
                                logger.error('Error creating user during Google auth:', {
                                    email: user.email,
                                    error: error.message,
                                    code: error.code
                                });
                                return false;
                            }

                            // Set user properties from newly created user
                            user.id = data.id;
                            user.credit_balance = data.credit_balance;
                            user.free_tier_used = data.free_tier_used;
                            user.last_credit_reset = data.last_credit_reset;

                            logger.info('New user created successfully via Google auth', {
                                userId: user.id,
                                creditBalance: data.credit_balance
                            });
                        } else {
                            // Some other database error occurred
                            logger.error('Error checking existing user during Google auth:', {
                                email: user.email,
                                error: userError.message,
                                code: userError.code
                            });

                            // Still try to continue the sign-in process
                            return true;
                        }
                    } else if (existingUser) {
                        // User exists, update user object with db data
                        user.id = existingUser.id;
                        user.credit_balance = existingUser.credit_balance;
                        user.free_tier_used = existingUser.free_tier_used;
                        user.last_credit_reset = existingUser.last_credit_reset;

                        logger.info('Existing user retrieved for Google auth', {
                            userId: user.id,
                            creditBalance: existingUser.credit_balance,
                            freeTierUsed: existingUser.free_tier_used
                        });
                    }
                }
                return true;
            } catch (error) {
                logger.error("SignIn callback error:", {
                    email: user.email,
                    error: error instanceof Error ? error.message : String(error)
                });
                return true; // Still allow sign in even if there's an error
            }
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
                token.credit_balance = user.credit_balance;
                token.free_tier_used = user.free_tier_used;
                token.last_credit_reset = user.last_credit_reset;

                logger.debug("JWT callback: Token updated with user data", {
                    userId: user.id,
                    creditBalance: user.credit_balance
                });
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.email = token.email as string;
                session.user.name = token.name as string;
                session.user.credit_balance = token.credit_balance as number;
                session.user.free_tier_used = token.free_tier_used as boolean;
                session.user.last_credit_reset = token.last_credit_reset as string;

                logger.debug("Session callback: Session updated with token data", {
                    userId: session.user.id,
                    creditBalance: session.user.credit_balance
                });
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
    debug: process.env.NODE_ENV === "development",
};