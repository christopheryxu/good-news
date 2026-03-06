import { NextRequest } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string; filename: string } }
) {
  const { jobId, filename } = params;
  const res = await fetch(`${BACKEND}/pipeline/${jobId}/file/${encodeURIComponent(filename)}`);
  if (!res.ok) return new Response("Not found", { status: 404 });
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "text/plain; charset=utf-8";
  const disposition = res.headers.get("content-disposition") ?? `attachment; filename="${filename}"`;
  return new Response(text, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": disposition,
    },
  });
}
