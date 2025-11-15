import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")

  try {
    const supabase = await createClient()

    console.log("[v0] Fetching stock from Supabase, category:", category)

    let items: any[] = []

    if (category === "all" || !category) {
      const { data: matieres } = await supabase.from("stock_monday_matieres").select("*")
      const { data: produitsFinis } = await supabase.from("stock_monday_produits_finis").select("*")
      const { data: accessoires } = await supabase.from("stock_monday_accessoires").select("*")

      items = [...(matieres || []), ...(produitsFinis || []), ...(accessoires || [])]
    } else if (category === "matieres-premieres") {
      const { data } = await supabase.from("stock_monday_matieres").select("*")
      items = data || []
    } else if (category === "produits-finis") {
      const { data } = await supabase.from("stock_monday_produits_finis").select("*")
      items = data || []
    } else if (category === "accessoires") {
      const { data } = await supabase.from("stock_monday_accessoires").select("*")
      items = data || []
    }

    console.log("[v0] Total items retrieved from Supabase:", items?.length || 0)

    const transformedItems =
      items?.map((item) => ({
        id: item.batch_sonefi?.toString() || "",
        name: item.reference_sonefi?.toString() || "",
        column_values: [
          {
            id: "texte__1",
            title: "Référence fournisseur",
            text: item.reference_fournisseur || "",
            value: item.reference_fournisseur || "",
          },
          {
            id: "label__1",
            title: "Catégorie",
            text: item.categorie || "",
            value: item.categorie || "",
          },
          {
            id: "texte7",
            title: "Fournisseur",
            text: item.fournisseur || "",
            value: item.fournisseur || "",
          },
          {
            id: "texte",
            title: "Unité",
            text: item.unite || "ML",
            value: item.unite || "ML",
          },
          {
            id: "chiffres",
            title: "Quantité",
            text: item.quantite?.toString() || "0",
            value: item.quantite?.toString() || "0",
          },
          {
            id: "chiffres6",
            title: "Prix unitaire HT",
            text: item.prix_unitaire_ht?.toString() || "0",
            value: item.prix_unitaire_ht?.toString() || "0",
          },
          {
            id: "label",
            title: "Matière SONEFI",
            text: item.reference_sonefi || "",
            value: item.reference_sonefi || "",
          },
          {
            id: "date",
            title: "Date",
            text: item.date_entree || "",
            value: item.date_entree || "",
          },
          {
            id: "date4",
            title: "Date entrée",
            text: item.date_entree || "",
            value: item.date_entree || "",
          },
          {
            id: "laize",
            title: "Laize (en mm)",
            text: item.laize_mm || "",
            value: item.laize_mm || "",
          },
          {
            id: "texte8",
            title: "Emplacement",
            text: item.emplacement || "",
            value: item.emplacement || "",
          },
          {
            id: "texte0",
            title: "Batch Sonefi",
            text: item.batch_sonefi?.toString() || "",
            value: item.batch_sonefi?.toString() || "",
          },
          {
            id: "texte9",
            title: "Batch Fournisseur",
            text: item.batch_fournisseur || "",
            value: item.batch_fournisseur || "",
          },
          {
            id: "texte1",
            title: "Référence Sellsy",
            text: item.reference_sellsy || "",
            value: item.reference_sellsy || "",
          },
        ],
      })) || []

    return NextResponse.json({
      items: transformedItems,
      total: transformedItems.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching stock:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
