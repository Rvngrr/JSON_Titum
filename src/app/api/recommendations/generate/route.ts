import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Recommendation generation endpoint" },
    { status: 501 }
  );
}
