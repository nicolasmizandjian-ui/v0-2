import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const idAtelier = searchParams.get("id_atelier")

    let query = supabase
      .from("affectations_produits")
      .select(`
        *,
        collaborateurs:id_collaborateur (
          id,
          nom,
          prenom,
          couleur,
          poste
        )
      `)

    if (idAtelier) {
      query = query.eq("id_atelier", idAtelier)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ affectations: data || [] })
  } catch (error: any) {
    console.error("[v0] Error fetching affectations:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id_atelier, id_collaborateur, etape } = body

    const { data, error } = await supabase
      .from("affectations_produits")
      .upsert(
        {
          id_atelier,
          id_collaborateur,
          etape,
          statut: "en_attente",
          date_debut: null,
          date_fin: null,
        },
        { onConflict: "id_atelier,id_collaborateur,etape" }
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ affectation: data })
  } catch (error: any) {
    console.error("[v0] Error creating affectation:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("affectations_produits")
      .delete()
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting affectation:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
