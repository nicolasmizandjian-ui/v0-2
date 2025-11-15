import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET() {
  try {
    console.log("[v0] Fetching correspondences from table_matiere...")
    
    const { data, error } = await supabase
      .from("table_matiere")
      .select("reference_sonefi, reference_sellsy, categorie, fournisseur")
      .order("categorie", { ascending: true })
      .order("reference_sonefi", { ascending: true })

    console.log("[v0] Query result - data count:", data?.length || 0)
    console.log("[v0] Query error:", error)

    if (error) {
      console.error("[v0] Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Returning correspondences:", data?.length || 0)
    return NextResponse.json(data || [])
  } catch (error) {
    console.error("[v0] Error fetching correspondences:", error)
    return NextResponse.json({ error: "Failed to fetch correspondences" }, { status: 500 })
  }
}
