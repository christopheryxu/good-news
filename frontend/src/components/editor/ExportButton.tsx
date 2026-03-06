"use client";

import { useExport } from "@/hooks/useExport";

interface Props {
  jobId: string;
}

export default function ExportButton({ jobId }: Props) {
  const { triggerExport, status, error, exportProgress } = useExport(jobId);
  const isExporting = status === "exporting" || status === "export_done";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        {/* Progress bar — visible while exporting, fills to 100 then disappears */}
        {isExporting && (
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C4842A] rounded-full"
                style={{
                  width: `${exportProgress}%`,
                  transition: exportProgress >= 100
                    ? "width 0.6s ease-in-out"
                    : "width 1s linear",
                }}
              />
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {exportProgress}%
            </span>
          </div>
        )}

        <button
          onClick={triggerExport}
          disabled={isExporting}
          className="px-4 py-1.5 rounded-lg bg-[#C4842A] hover:bg-[#1A1207] text-white font-semibold text-sm disabled:opacity-50 transition-colors"
        >
          {isExporting ? "Exporting..." : "Export"}
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-xs text-right max-w-xs">{error}</p>
      )}
    </div>
  );
}
