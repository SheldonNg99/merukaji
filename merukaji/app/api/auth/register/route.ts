// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const INITIAL_FREE_CREDITS = 3;

export async function POST(req: NextRequest) {
    try {
        const { email, name, password } = await req.json();

        // Input validation
        if (!email || !name || !password) {
            return NextResponse.json({
                error: "Missing required fields",
                details: "Email, name, and password are required"
            }, { status: 400 });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({
                error: "Invalid email format"
            }, { status: 400 });
        }

        // Check if user already exists
        const { data: existingUser, error: userError } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("email", email)
            .single();

        if (userError && userError.code !== "PGRST116") { // 'No rows found' is acceptable here
            logger.error("Error checking existing user", {
                error: userError.message,
                email: email // Log email for debugging
            });
            return NextResponse.json({
                error: "Failed to check user existence"
            }, { status: 500 });
        }

        if (existingUser) {
            return NextResponse.json({
                error: "User already exists"
            }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const now = new Date().toISOString();

        // Create user with initial credits
        const { data: newUser, error: createError } = await supabaseAdmin
            .from("users")
            .insert({
                email,
                name,
                password: hashedPassword,
                credit_balance: INITIAL_FREE_CREDITS,
                free_tier_used: false, // They haven't used their free credits yet
                last_credit_reset: now,
                created_at: now,
                updated_at: now
            })
            .select('id')
            .single();

        if (createError) {
            logger.error("Error registering user", {
                error: createError.message,
                email: email
            });
            return NextResponse.json({
                error: "Failed to create user account"
            }, { status: 500 });
        }

        // Record the initial credit grant
        const { error: creditError } = await supabaseAdmin
            .from('credits')
            .insert({
                user_id: newUser.id,
                amount: INITIAL_FREE_CREDITS,
                description: `Welcome! ${INITIAL_FREE_CREDITS} free credits`,
                created_at: now
            });

        if (creditError) {
            logger.error("Error recording initial credits", {
                error: creditError.message,
                userId: newUser.id
            });
            // Don't return error to client since user was created successfully
        }

        // Log successful registration
        logger.info("User registered successfully", {
            userId: newUser.id,
            email: email,
            initialCredits: INITIAL_FREE_CREDITS
        });

        return NextResponse.json({
            success: true,
            userId: newUser.id,
            credits: INITIAL_FREE_CREDITS
        });

    } catch (err) {
        logger.error("Registration failed", {
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined
        });

        return NextResponse.json({
            error: "Internal server error during registration"
        }, { status: 500 });
    }
}