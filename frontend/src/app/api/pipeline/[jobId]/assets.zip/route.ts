import { NextRequest } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const res = await fetch(`${BACKEND}/pipeline/${params.jobId}/assets.zip`);
  if (!res.ok) return new Response("Not found", { status: 404 });
  const disposition = res.headers.get("content-disposition") ?? "attachment";
  return new Response(res.body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": disposition,
    },
  });
}
