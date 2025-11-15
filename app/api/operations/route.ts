import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const operationSchema = z.object({
  wo_id: z.string().uuid(),
  operation_type: z.enum(["RECEPTION", "DECOUPE", "COUTURE", "LAVAGE", "CONTROLE", "EXPEDITION"]),
  product_id: z.string().uuid().optional(),
  lot_id: z.string().uuid().optional(),
  qty: z.number().positive().optional(),
  note: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = operationSchema.parse(body)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("operations")
      .insert({
        wo_id: validated.wo_id,
        operation_type: validated.operation_type,
        product_id: validated.product_id,
        lot_id: validated.lot_id,
        qty: validated.qty,
        note: validated.note,
      })
      .select("id")
      .single()

    if (error) {
      console.error("[v0] Error creating operation:", error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: data.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid input", details: error.errors }, { status: 400 })
    }

    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 })
  }
}
