import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FFF2DB] flex flex-col">
      {/* Header/Navigation */}
      <header className="w-full p-4 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-[#FF9B3B]">Merukaji</h1>
        </div>
        <Link
          href="/login"
          className="bg-[#FFAB5B] text-white px-6 py-2 rounded-lg hover:bg-[#FF9B3B] transition-colors duration-200"
        >
          Login
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
          Get Key Points from YouTube Videos <span className="text-[#FFAB5B]">Instantly</span>
        </h2>

        <p className="text-xl mb-8 max-w-2xl text-gray-700">
          Merukaji helps you save time by extracting the most important information
          from YouTube videos using AI-powered summarization.
        </p>

        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <h3 className="text-xl font-semibold mb-4">Try it now</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Paste YouTube URL"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FFAB5B]"
            />
            <button className="bg-[#FFAB5B] text-white px-6 py-3 rounded-lg hover:bg-[#FF9B3B] transition-colors duration-200">
              Summarize
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            * Free users can summarize up to 5 videos per day
          </p>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 w-full max-w-4xl">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-lg mb-2">Save Time</h3>
            <p className="text-gray-600">Get the key points from videos without watching the entire content.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-lg mb-2">AI-Powered</h3>
            <p className="text-gray-600">Advanced AI models extract the most important information.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-lg mb-2">Premium Features</h3>
            <p className="text-gray-600">Upgrade to Premium for comprehensive summaries and unlimited use.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full p-6 bg-white mt-16">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 mb-4 md:mb-0">© 2025 Merukaji. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="text-gray-600 hover:text-[#FFAB5B]">Terms</Link>
            <Link href="/privacy" className="text-gray-600 hover:text-[#FFAB5B]">Privacy</Link>
            <Link href="/contact" className="text-gray-600 hover:text-[#FFAB5B]">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}