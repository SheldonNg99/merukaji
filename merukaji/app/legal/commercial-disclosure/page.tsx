// app/(public)/legal/commercial-disclosure/page.tsx
'use client';

import Link from 'next/link';

export default function CommercialDisclosurePage() {
    return (
        <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#202120] py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <div className="bg-white dark:bg-[#2E2E2E] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                        特定商取引法に基づく表記 (Commercial Disclosure)
                    </h1>

                    <div className="space-y-8">
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                事業者名 (Business Name)
                            </h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                Merukaji (個人事業)
                            </p>
                        </div>

                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                代表者名 (Representative)
                            </h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                NG KAI JIN
                            </p>
                        </div>

                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                所在地 (Address)
                            </h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                北海道札幌市<br />
                                Sapporo, Hokkaido<br />
                                Japan
                            </p>
                        </div>

                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                連絡先 (Contact Information)
                            </h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                Email: merukaji413@gmail.com
                            </p>
                        </div>

                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                販売価格 (Pricing)
                            </h2>
                            <div className="text-gray-700 dark:text-gray-300 space-y-2">
                                <p>Free プラン: 無料 (Free)</p>
                                <p>Pro プラン: 月額 US$19.00 または 年額 US$204.00 (税込)</p>
                                <p>Max プラン: 月額 US$49.00 または 年額 US$529.00 (税込)</p>
                                <p>※価格はすべて消費税込みの表示です。(All prices include consumption tax.)</p>
                                <p>※表示価格は米ドルです。日本円でのお支払いの場合、決済時の為替レートが適用されます。</p>
                                <p>(Prices are displayed in US dollars. For payments in Japanese yen, the exchange rate at the time of payment will apply.)</p>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                支払方法 (Payment Methods)
                            </h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                クレジットカード (Credit Card)<br />
                                ※ Stripe決済を利用しています。(We use Stripe for payment processing.)
                            </p>
                        </div>

                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                サービス提供時期 (Service Delivery)
                            </h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                お支払い完了後、直ちにサービスをご利用いただけます。<br />
                                (Our service is available immediately after payment completion.)
                            </p>
                        </div>

                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                返品・キャンセルについて (Refund & Cancellation Policy)
                            </h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                デジタルサービスのため返品は受け付けておりません。サブスクリプションはいつでもキャンセル可能で、期間終了まではサービスをご利用いただけます。<br />
                                (As a digital service, we do not accept returns. Subscriptions can be canceled at any time, and service will continue until the end of the paid period.)
                            </p>
                        </div>

                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                動作環境 (System Requirements)
                            </h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                モダンなウェブブラウザ（Google Chrome、Safari、Firefox、Microsoft Edge最新版推奨）<br />
                                (Modern web browsers: Google Chrome, Safari, Firefox, Microsoft Edge - latest versions recommended)
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <Link href="/" className="text-[#FFAB5B] hover:text-[#FF9B3B] transition-colors">
                        ホームに戻る (Return to Home)
                    </Link>
                </div>
            </div>
        </div>
    );
}