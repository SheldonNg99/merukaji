'use client';

import { signIn } from "next-auth/react";

export default function Login() {
    const handleGoogleSignIn = () => {
        signIn("google", { callbackUrl: "/" });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FFF2DB]">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Merukaji</h2>
                    <p className="text-gray-600">
                        Get instant video summaries powered by AI
                    </p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 text-white bg-[#FFAB5B] rounded-lg hover:bg-[#FF9B3B] transition-colors duration-200"
                    >
                        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                            <span className="text-[#FFAB5B] font-bold">G</span>
                        </div>
                        Continue with Google
                    </button>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        By continuing, you agree to our{" "}
                        <a href="/terms" className="text-[#FFAB5B] hover:underline">
                            Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="/privacy" className="text-[#FFAB5B] hover:underline">
                            Privacy Policy
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}