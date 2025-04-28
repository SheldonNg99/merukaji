'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useToast } from '@/app/components/contexts/ToastContext';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { showToast } = useToast();

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Show success toast
            showToast('Account created successfully!', 'success', 3000);

            // Automatically sign in after successful registration
            const signInResult = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (signInResult?.error) {
                // If sign-in fails, show error toast but don't prevent navigation
                showToast('Account created but automatic login failed. Please log in manually.', 'warning', 5000);
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1500);
            } else {
                setTimeout(() => {
                    window.location.href = '/home';
                }, 1500);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Registration failed';
            setError(errorMessage);
            showToast(errorMessage, 'error', 5000);
            console.error('Registration error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-[#edf2f7] min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
                {/* Logo and Title */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">Create an Account</h2>
                    <p className="text-base text-gray-600">Join Merukaji and start summarizing videos</p>
                </div>

                {/* Error message - keeping this for immediate feedback */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-[#FFAB5B] focus:border-transparent transition-all duration-200"
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email
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
                            placeholder="Choose a strong password"
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
                                <span>Creating account...</span>
                            </div>
                        ) : (
                            'Create Account →'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link href="/login" className="text-[#FFAB5B] hover:text-[#FF9B3B] font-medium">
                        Log in
                    </Link>
                </div>

                <p className="mt-8 text-center text-sm text-gray-500">
                    By continuing, you agree to our{' '}
                    <a href="/terms" className="text-[#FFAB5B] hover:text-[#FF9B3B] font-medium">
                        Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-[#FFAB5B] hover:text-[#FF9B3B] font-medium">
                        Privacy Policy
                    </a>
                </p>
            </div>
        </div>
    );
}