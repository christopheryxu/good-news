import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const res = await fetch(`${BACKEND}/export/${params.jobId}/progress`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
