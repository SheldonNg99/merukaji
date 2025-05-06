import { supabaseAdmin } from "./supabase";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000;

export async function checkLoginAttempts(email: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
        .from("login_attempts")
        .select("*")
        .eq("email", email)
        .single();

    if (error && error.code !== "PGRST116") {
        console.error("Error checking login attempts:", error);
        return true; // Allow login if we can't check attempts
    }

    if (data) {
        const attempts = data.attempts || 0;
        const lastAttempt = new Date(data.last_attempt).getTime();
        const now = Date.now();

        // Check if account is locked
        if (attempts >= MAX_FAILED_ATTEMPTS && (now - lastAttempt) < LOCKOUT_DURATION) {
            return false; // Account is locked
        }

        // Reset attempts if lockout period has passed
        if ((now - lastAttempt) > LOCKOUT_DURATION) {
            await resetLoginAttempts(email);
        }
    }

    return true; // Allow login attempt
}

export async function recordFailedAttempt(email: string): Promise<void> {
    const { data } = await supabaseAdmin
        .from("login_attempts")
        .select("*")
        .eq("email", email)
        .single();

    if (data) {
        await supabaseAdmin
            .from("login_attempts")
            .update({
                attempts: (data.attempts || 0) + 1,
                last_attempt: new Date().toISOString()
            })
            .eq("email", email);
    } else {
        await supabaseAdmin
            .from("login_attempts")
            .insert({
                email,
                attempts: 1,
                last_attempt: new Date().toISOString()
            });
    }
}

export async function resetLoginAttempts(email: string): Promise<void> {
    await supabaseAdmin
        .from("login_attempts")
        .update({
            attempts: 0,
            last_attempt: new Date().toISOString()
        })
        .eq("email", email);
}