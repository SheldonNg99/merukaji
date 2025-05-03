import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {

        logger.info('history route requested', {
            method: req.method
        });

        const { data: summaries, error } = await supabaseAdmin
            .from("summaries")
            .select("id, metadata->>title")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(20);

        if (error) {
            logger.error("Error fetching history", { error: error.message });
            return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
        }

        const transformedSummaries = summaries.map((item) => ({
            id: item.id,
            title: item.title || "Untitled Video",
        }));

        return NextResponse.json({
            success: true,
            count: transformedSummaries.length,
            summaries: transformedSummaries,
        });
    } catch (err) {
        logger.error("History request failed", { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
