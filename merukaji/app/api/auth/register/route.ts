import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
    try {
        const { email, name, password } = await req.json();

        // Validate input
        if (!email || !name || !password) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Connect to database
        const client = await clientPromise;
        const db = client.db();

        // Check if user already exists
        const existingUser = await db.collection("users").findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                { error: "User already exists" },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = await db.collection("users").insertOne({
            email,
            name,
            password: hashedPassword,
            tier: "free",
            createdAt: new Date(),
        });

        logger.info("User registered successfully", { email });

        return NextResponse.json({
            success: true,
            userId: result.insertedId.toString(),
        });
    } catch (error) {
        logger.error("Error registering user", {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            { error: "Failed to register user" },
            { status: 500 }
        );
    }
}