import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const atelierMovementSchema = z.object({
  type: z.enum([
    "DECOUPE_DEBUT",
    "DECOUPE_FIN",
    "CONFECTION_DEBUT",
    "CONFECTION_FIN",
    "ASSEMBLAGE_DEBUT",
    "ASSEMBLAGE_FIN",
    "EXPEDITION",
  ]),
  client: z.string(),
  reference_article_sonefi: z.string(),
  statut_avant: z.string().optional(),
  statut_apres: z.string().optional(),
  quantite: z.number().optional(),
  unite: z.string().optional(),
  duree_minutes: z.number().optional(),
  note: z.string().optional(),
  rouleaux_utilises: z.array(z.any()).optional(),
  id_atelier: z.number().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[v0] Atelier movement request:", body)

    const validated = atelierMovementSchema.parse(body)

    const supabase = await createClient()

    // Insert movement into history
    const { data, error } = await supabase
      .from("historique_mouvements_atelier")
      .insert({
        type_mouvement: validated.type,
        client: validated.client,
        reference_article_sonefi: validated.reference_article_sonefi,
        statut_avant: validated.statut_avant,
        statut_apres: validated.statut_apres,
        quantite: validated.quantite,
        unite: validated.unite,
        duree_minutes: validated.duree_minutes,
        note: validated.note,
        rouleaux_utilises: validated.rouleaux_utilises ? JSON.stringify(validated.rouleaux_utilises) : null,
        id_atelier: validated.id_atelier,
        origine: "api",
      })
      .select("id")
      .single()

    if (error) {
      console.error("[v0] Error creating atelier movement:", error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    console.log("[v0] Atelier movement created successfully:", data)
    return NextResponse.json({ ok: true, id: data.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[v0] Validation error:", error.errors)
      return NextResponse.json({ ok: false, error: "Invalid input", details: error.errors }, { status: 400 })
    }

    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const client = searchParams.get("client")
    const reference = searchParams.get("reference")
    const type = searchParams.get("type")
    const limit = searchParams.get("limit") || "100"

    const supabase = await createClient()

    let query = supabase
      .from("historique_mouvements_atelier")
      .select("*")
      .order("date_mouvement", { ascending: false })
      .limit(parseInt(limit))

    if (client) {
      query = query.eq("client", client)
    }

    if (reference) {
      query = query.eq("reference_article_sonefi", reference)
    }

    if (type) {
      query = query.eq("type_mouvement", type)
    }

    const { data, error } = await query

    if (error) {
      console.error("[v0] Error fetching atelier movements:", error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, movements: data })
  } catch (error) {
    console.error("[v0] Error in GET atelier movements:", error)
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 })
  }
}
