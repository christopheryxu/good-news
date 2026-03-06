import GoodNewsLogo from "@/components/landing/GoodNewsLogo";
import UrlInputForm from "@/components/landing/UrlInputForm";
import PoweredByTicker from "@/components/landing/PoweredByTicker";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-xl flex flex-col items-center gap-8">
        <GoodNewsLogo />
        <p className="text-gray-500 text-base text-center leading-relaxed max-w-md">
          Paste any newsletter URL and we&apos;ll generate a ready-to-post TikTok video with
          downloadable AI assets.
        </p>
        <UrlInputForm />
        <PoweredByTicker />
      </div>
    </main>
  );
}
