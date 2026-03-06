"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startPipeline } from "@/lib/api";

export default function UrlInputForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!url.trim()) return;
    setLoading(true);
    try {
      const { job_id } = await startPipeline(url.trim(), "Rachel");
      router.push(`/editor/${job_id}`);
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="url" className="text-sm font-medium text-gray-700">
          Newsletter URL
        </label>
        <input
          id="url"
          type="url"
          required
          placeholder="https://example.substack.com/p/your-post"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-lg bg-white border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#C4842A] focus:border-transparent"
        />
      </div>

      {error && (
        <p className="text-red-500 text-sm rounded-lg bg-red-50 border border-red-200 px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-[#C4842A] hover:bg-[#1A1207] px-6 py-3 font-semibold text-white disabled:opacity-50 transition-colors"
      >
        {loading ? "Starting pipeline..." : "Generate TikTok Video"}
      </button>
    </form>
  );
}
