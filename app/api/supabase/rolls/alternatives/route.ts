import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    console.log("[v0] Alternatives route called")

    const { firstLetter } = await request.json()

    if (!firstLetter) {
      return NextResponse.json({ error: "firstLetter is required" }, { status: 400 })
    }

    console.log("[v0] Searching for materials starting with:", firstLetter)

    const supabase = await createClient()

    const { data: materials, error } = await supabase
      .from("STOCK_MONDAY")
      .select('"Matière SELLSY", "Matière SONEFI", "Quantité", "Catégorie"')
      .ilike("Matière SELLSY", `${firstLetter}%`)
      .gt("Quantité", 0)
      .not("Matière SONEFI", "is", null)

    if (error) {
      console.error("[v0] Supabase error:", error)
      return NextResponse.json({ error: "Failed to fetch materials", details: error }, { status: 500 })
    }

    console.log("[v0] Found", materials?.length || 0, "materials")

    console.log("[v0] All Matière SELLSY values:", materials?.map((m) => m["Matière SELLSY"]).sort())

    const rawMaterials =
      materials?.filter((m) => {
        const sellsyRef = m["Matière SELLSY"]
        return sellsyRef && !sellsyRef.startsWith("PF")
      }) || []

    console.log("[v0] After filtering out finished products (PF*):", rawMaterials.length, "materials")

    const uniqueSellsy = new Set(rawMaterials.map((m) => m["Matière SELLSY"]))
    console.log("[v0] Unique Matière SELLSY values (raw materials only):", Array.from(uniqueSellsy).sort())

    const grouped = new Map<string, { sellsyRef: string; sonefiRef: string; totalStock: number; category: string }>()

    rawMaterials.forEach((material) => {
      const sonefiRef = material["Matière SONEFI"]
      const sellsyRef = material["Matière SELLSY"]
      const quantity = material["Quantité"] || 0
      const category = material["Catégorie"] || ""

      if (sonefiRef) {
        if (grouped.has(sonefiRef)) {
          const existing = grouped.get(sonefiRef)!
          existing.totalStock += quantity
        } else {
          grouped.set(sonefiRef, {
            sellsyRef: sellsyRef || "",
            sonefiRef,
            totalStock: quantity,
            category,
          })
        }
      }
    })

    const result = Array.from(grouped.values())
    console.log("[v0] Returning", result.length, "unique materials")
    console.log("[v0] Materials:", result.map((m) => `${m.sellsyRef} (${m.sonefiRef})`).join(", "))

    return NextResponse.json({ materials: result })
  } catch (error) {
    console.error("[v0] Error in alternatives route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
