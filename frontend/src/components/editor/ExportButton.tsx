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
