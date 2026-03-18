import { NextRequest, NextResponse } from "next/server";
import { searchAll } from "@/lib/data";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json({ claims: [], moments: [] });
  }

  const results = searchAll(query);
  return NextResponse.json(results);
}
