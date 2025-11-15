import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { materialRefs } = await request.json()

    console.log("[v0] Fetching batches for materials:", materialRefs)

    if (!materialRefs || materialRefs.length === 0) {
      return NextResponse.json({ batches: {} })
    }

    const supabase = await createClient()

    const { data: batchesData, error } = await supabase
      .from("stock_monday_matieres")
      .select("batch_sonefi, reference_sonefi, reference_sellsy, batch_fournisseur, quantite, laize_mm, unite")
      .in("reference_sonefi", materialRefs)
      .gt("quantite", 0)
      .order("quantite", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching batches:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[v0] Query returned ${batchesData?.length || 0} batches`)

    const batchesByMaterial: Record<string, any[]> = {}

    batchesData?.forEach((batch) => {
      const materialRef = batch.reference_sonefi

      console.log(
        `[v0] Processing batch for material: ${materialRef}, Batch Sonefi: ${batch.batch_sonefi}, Stock: ${batch.quantite}`,
      )

      const matchedRef = materialRefs.find((ref: string) => ref === batch.reference_sonefi)

      if (matchedRef) {
        if (!batchesByMaterial[matchedRef]) {
          batchesByMaterial[matchedRef] = []
        }

        batchesByMaterial[matchedRef].push({
          id: batch.batch_sonefi,
          materialRef: materialRef,
          batchSonefi: batch.batch_sonefi,
          batchFournisseur: batch.batch_fournisseur,
          stock: batch.quantite,
          laize: batch.laize_mm,
          unit: batch.unite || "ML",
        })
      }
    })

    console.log(`[v0] Found ${batchesData?.length || 0} batches for ${Object.keys(batchesByMaterial).length} materials`)
    console.log(
      `[v0] Batches by material:`,
      Object.keys(batchesByMaterial).map((key) => `${key}: ${batchesByMaterial[key].length} batches`),
    )

    return NextResponse.json({ batches: batchesByMaterial })
  } catch (error: any) {
    console.error("[v0] Error in batches route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
