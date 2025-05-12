// types/next-auth.d.ts
import { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            credit_balance?: number;
            free_tier_used?: boolean;
            last_credit_reset?: string;
        } & DefaultSession["user"]
    }

    interface User {
        id: string;
        email: string;
        name?: string;
        credit_balance?: number;
        free_tier_used?: boolean;
        last_credit_reset?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        credit_balance?: number;
        free_tier_used?: boolean;
        last_credit_reset?: string;
    }
}