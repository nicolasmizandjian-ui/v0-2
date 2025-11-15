import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    console.log("[v0] BATCH ROUTE CALLED")

    // Return minimal response to test if route works
    return NextResponse.json({
      rollsByReference: {},
      test: "Route is working",
    })
  } catch (error) {
    console.error("[v0] ERROR:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
