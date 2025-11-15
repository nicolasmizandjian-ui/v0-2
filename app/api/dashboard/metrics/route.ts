import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Starting metrics fetch...")
    
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

    console.log("[v0] Fetching atelier data...")
    
    const { data: atelierData, error: atelierError } = await supabase
      .from("atelier_monday")
      .select("id, statut, temps_decoupe_minutes, temps_confection_minutes, temps_assemblage_minutes")

    if (atelierError) {
      console.error("[v0] Error fetching atelier data:", atelierError)
      throw atelierError
    }

    console.log("[v0] Atelier data count:", atelierData?.length || 0)

    // Calculer les métriques
    const metricsData = atelierData || []
    
    const commandesParStatut = metricsData.reduce((acc: any, item: any) => {
      const statut = item.statut || "inconnu"
      acc[statut] = (acc[statut] || 0) + 1
      return acc
    }, {})

    const totalCommandes = metricsData.length
    const commandesAFaire = commandesParStatut["a_faire"] || 0
    const commandesDecoupeEnCours = commandesParStatut["decoupe_en_cours"] || 0
    const commandesConfection = commandesParStatut["confection_a_faire"] || 0
    const commandesAssemblage = commandesParStatut["assemblage_a_faire"] || 0
    const commandesAExpedier = commandesParStatut["a_expedier"] || 0

    console.log("[v0] Fetching stock data...")

    const { data: stockMatieres } = await supabase
      .from("stock_monday_matieres")
      .select("quantite, prix_unitaire_ht")

    const { data: stockProduitsFinis } = await supabase
      .from("stock_monday_produits_finis")
      .select("quantite, prix_unitaire_ht")

    const valeurStockMatieres = (stockMatieres || []).reduce(
      (sum: number, item: any) =>
        sum + (Number(item.quantite) || 0) * (Number(item.prix_unitaire_ht) || 0),
      0
    )

    const valeurStockProduitsFinis = (stockProduitsFinis || []).reduce(
      (sum: number, item: any) =>
        sum + (Number(item.quantite) || 0) * (Number(item.prix_unitaire_ht) || 0),
      0
    )

    console.log("[v0] Fetching movement history...")

    // Récupérer les mouvements d'atelier des derniers 7 jours
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: mouvements } = await supabase
      .from("historique_mouvements_atelier")
      .select("id_atelier, type_mouvement, date_mouvement")
      .gte("date_mouvement", sevenDaysAgo.toISOString())

    const produitsTraites7j = new Set(
      (mouvements || [])
        .filter((m: any) => m.type_mouvement === "DECOUPE_FIN")
        .map((m: any) => m.id_atelier)
    ).size

    const tempsDecoupeFiltered = metricsData.filter((item: any) => item.temps_decoupe_minutes)
    const countDecoupe = tempsDecoupeFiltered.length
    const tempsMoyenDecoupe = countDecoupe > 0
      ? tempsDecoupeFiltered.reduce((sum: number, item: any) => sum + item.temps_decoupe_minutes, 0) / countDecoupe
      : 0

    const tempsConfectionFiltered = metricsData.filter((item: any) => item.temps_confection_minutes)
    const countConfection = tempsConfectionFiltered.length
    const tempsMoyenConfection = countConfection > 0
      ? tempsConfectionFiltered.reduce((sum: number, item: any) => sum + item.temps_confection_minutes, 0) / countConfection
      : 0

    const tempsAssemblageFiltered = metricsData.filter((item: any) => item.temps_assemblage_minutes)
    const countAssemblage = tempsAssemblageFiltered.length
    const tempsMoyenAssemblage = countAssemblage > 0
      ? tempsAssemblageFiltered.reduce((sum: number, item: any) => sum + item.temps_assemblage_minutes, 0) / countAssemblage
      : 0

    console.log("[v0] Metrics calculation complete")

    return NextResponse.json({
      production: {
        totalCommandes,
        commandesAFaire,
        commandesDecoupeEnCours,
        commandesConfection,
        commandesAssemblage,
        commandesAExpedier,
        commandesParStatut,
      },
      stock: {
        valeurStockMatieres: Math.round(valeurStockMatieres * 100) / 100,
        valeurStockProduitsFinis: Math.round(valeurStockProduitsFinis * 100) / 100,
        valeurTotale:
          Math.round((valeurStockMatieres + valeurStockProduitsFinis) * 100) / 100,
      },
      performance: {
        produitsTraites7j,
        tempsMoyenDecoupe: Math.round(tempsMoyenDecoupe),
        tempsMoyenConfection: Math.round(tempsMoyenConfection),
        tempsMoyenAssemblage: Math.round(tempsMoyenAssemblage),
      },
    })
  } catch (error: any) {
    console.error("[v0] Error fetching dashboard metrics:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
