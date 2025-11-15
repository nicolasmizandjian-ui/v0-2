import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Fetching planning products from atelier_monday...")
    
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: atelierData, error: atelierError } = await supabase
      .from("atelier_monday")
      .select("*")
      .eq("type_commande", "Atelier")
      .neq("statut", "expedie") // Exclure seulement les produits déjà expédiés
      .order("client", { ascending: true })
      .order("reference_article_sonefi", { ascending: true })

    if (atelierError) {
      console.error("[v0] Error fetching atelier_monday:", atelierError)
      throw atelierError
    }

    console.log(`[v0] Found ${atelierData?.length || 0} products in atelier_monday`)
    console.log(`[v0] Sample statuts:`, atelierData?.slice(0, 5).map(p => p.statut))

    const produits = (atelierData || []).map((product) => ({
      id: product.id,
      client: product.client || "Client inconnu",
      reference_article_sonefi: product.reference_article_sonefi || "",
      quantite: product.quantite || 0,
      unite: product.unite || "",
      statut: product.statut || "a_faire",
      date_reception_commande: product.date_reception_commande,
    }))

    console.log("[v0] Returning products:", produits.length)
    
    return NextResponse.json({ produits })
  } catch (error: any) {
    console.error("[v0] Error in planning API:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error", produits: [] }, 
      { status: 500 }
    )
  }
}
