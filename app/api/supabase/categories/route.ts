import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("table_categorie")
      .select("categorie, code_categorie, famille")
      .order("categorie", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching categories:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ categories: data || [] })
  } catch (error) {
    console.error("[v0] Error in categories route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
