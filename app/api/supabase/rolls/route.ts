import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { sellsyReference } = await request.json()

    if (!sellsyReference) {
      return NextResponse.json({ error: "sellsyReference is required" }, { status: 400 })
    }

    const supabase = await createClient()

    console.log("[v0] Fetching rolls for reference:", sellsyReference)

    const { data: rolls, error } = await supabase
      .from("STOCK_MONDAY") // Removed quotes from table name
      .select("*")
      .eq("Référence fournisseur", sellsyReference)
      .gt("Quantité", 0)

    if (error) {
      console.error("[v0] Supabase error fetching rolls:", error)
      return NextResponse.json({ error: "Failed to fetch rolls", details: error }, { status: 500 })
    }

    const transformedRolls =
      rolls?.map((roll) => ({
        id: roll["Batch Sonefi"]?.toString() || "",
        batch: roll["Batch Sonefi"]?.toString() || "",
        stock: roll["Quantité"] || 0,
        laize: roll["Laize (en mm)"] || "",
        location: roll["Emplacement"] || "",
      })) || []

    console.log("[v0] Found", transformedRolls.length, "rolls for reference", sellsyReference)

    return NextResponse.json({
      rolls: transformedRolls,
    })
  } catch (error) {
    console.error("[v0] Error fetching rolls:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
