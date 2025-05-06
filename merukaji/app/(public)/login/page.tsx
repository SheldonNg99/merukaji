'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/app/components/contexts/ToastContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const errorType = searchParams.get('error');

        if (errorType === 'OAuthAccountNotLinked') {
            setError('An account with this email already exists. Please sign in with your email and password instead.');
            showToast('Please use your email and password to sign in', 'warning', 5000);
        }
    }, [searchParams, showToast]);

    const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Use signIn with specific configuration
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError(result.error);
                showToast(result.error, 'error', 5000);
                setIsLoading(false);
            } else if (result?.ok) {
                // Success toast
                showToast('Login successful!', 'success', 3000);

                // Use the router to navigate to home
                setTimeout(() => {
                    router.push('/home');
                    router.refresh(); // Force router to refresh
                }, 1000);
            }
        } catch (error) {
            const errorMessage = 'An unexpected error occurred';
            setError(errorMessage);
            showToast(errorMessage, 'error', 5000);
            console.error('Login error:', error);
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        signIn('google', { callbackUrl: '/home' });
    };

    return (
        <div className="bg-[#edf2f7] min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
                {/* Logo and Title */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome to Merukaji</h2>
                    <p className="text-base text-gray-600">Access your AI-powered video summaries</p>
                </div>

                {/* Error message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleEmailLogin} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Work email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-[#FFAB5B] focus:border-transparent transition-all duration-200"
                            placeholder="name@email.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-[#FFAB5B] focus:border-transparent transition-all duration-200"
                            placeholder="Enter your password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center py-3 px-6 rounded-xl text-base font-semibold text-white bg-[#e99947] hover:bg-[#FF9B3B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e99947] disabled:opacity-50 transition-all duration-200"
                    >
                        {isLoading ? (
                            <div className="flex items-center">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                <span>Signing in...</span>
                            </div>
                        ) : (
                            'Continue with Email →'
                        )}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-500">or</span>
                    </div>
                </div>

                <button
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 text-base font-semibold"
                >
                    <div className="w-5 h-5 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                    </div>
                    Continue with Google
                </button>

                <div className="mt-6 text-center text-sm text-gray-500">
                    Do not have an account?{' '}
                    <Link href="/register" className="text-[#FFAB5B] hover:text-[#FF9B3B] font-medium">
                        Create an account
                    </Link>
                </div>

                {/* <p className="mt-8 text-center text-sm text-gray-500">
                    By continuing, you agree to our{' '}
                    <a href="/terms" className="text-[#FFAB5B] hover:text-[#FF9B3B] font-medium">
                        Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-[#FFAB5B] hover:text-[#FF9B3B] font-medium">
                        Privacy Policy
                    </a>
                </p> */}
            </div>
        </div>
    );
}