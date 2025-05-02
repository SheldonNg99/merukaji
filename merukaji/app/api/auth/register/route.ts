import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
    try {
        const { email, name, password } = await req.json();

        if (!email || !name || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if user already exists
        const { data: existingUser, error: userError } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("email", email)
            .single();

        if (userError && userError.code !== "PGRST116") { // 'No rows found' is acceptable here
            logger.error("Error checking existing user", { error: userError.message });
            return NextResponse.json({ error: "Failed to check user" }, { status: 500 });
        }

        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const { data, error } = await supabaseAdmin.from("users").insert({
            email,
            name,
            password: hashedPassword,
            tier: "free",
        }).select("id").single();

        if (error) {
            logger.error("Error registering user", { error: error.message });
            return NextResponse.json({ error: "Failed to register user" }, { status: 500 });
        }

        logger.info("User registered successfully", { email });

        return NextResponse.json({
            success: true,
            userId: data.id,
        });
    } catch (err) {
        logger.error("Registration failed", { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
