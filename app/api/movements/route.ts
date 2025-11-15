import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const movementSchema = z.object({
  product_id: z.string().optional(),
  lot_id: z.string().optional(),
  type: z.enum(["ENTREE", "SORTIE", "CONSOMMATION", "AJUSTEMENT", "DELAIZAGE"]),
  qty: z.number().positive().optional(), // Optional for délaizage
  note: z.string().optional(),
  // Fields for material entry
  category: z.string().optional(),
  material_reference: z.string().optional(),
  batch_fournisseur: z.string().optional(),
  fournisseur: z.string().optional(),
  batch_sonefi: z.string().optional(),
  laize: z.number().optional(),
  quantite: z.number().optional(),
  unite: z.string().optional(),
  decoupe_type: z.string().optional(),
  laize_enlevee: z.number().optional(), // Changed from laize_decoupe
  // Fields for ajustement
  emplacement: z.string().optional(),
  prixHT: z.number().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[v0] Movement request body:", body)

    const validated = movementSchema.parse(body)
    console.log("[v0] Validated movement data:", validated)

    const supabase = await createClient()

    // Handle material entry (matieres_premieres + ENTREE)
    if (validated.category === "matieres_premieres" && validated.type === "ENTREE") {
      const { data: materialData, error: materialError } = await supabase
        .from("table_matiere")
        .select("reference_sonefi, reference_sellsy, categorie")
        .eq("reference_sonefi", validated.material_reference)
        .single()

      if (materialError) {
        console.error("[v0] Error fetching material:", materialError)
        return NextResponse.json({ ok: false, error: "Matière introuvable" }, { status: 404 })
      }

      const { error: insertError } = await supabase.from("stock_monday_matieres").insert({
        reference_sonefi: materialData.reference_sonefi,
        reference_sellsy: materialData.reference_sellsy,
        categorie: materialData.categorie,
        batch_fournisseur: validated.batch_fournisseur,
        fournisseur: validated.fournisseur,
        batch_sonefi: validated.batch_sonefi,
        laize_mm: validated.laize?.toString(),
        quantite: validated.quantite,
        unite: validated.unite,
        date_entree: new Date().toISOString().split("T")[0],
      })

      if (insertError) {
        console.error("[v0] Error inserting into stock:", insertError)
        return NextResponse.json({ ok: false, error: "Erreur lors de l'ajout au stock" }, { status: 500 })
      }

      await supabase.from("historique_mouvements_matieres").insert({
        type_mouvement: "ENTREE",
        reference_sonefi: materialData.reference_sonefi,
        reference_sellsy: materialData.reference_sellsy,
        categorie_matiere: materialData.categorie,
        batch_sonefi: validated.batch_sonefi,
        batch_fournisseur: validated.batch_fournisseur,
        fournisseur: validated.fournisseur,
        laize_mm: validated.laize,
        quantite_avant: 0,
        quantite_mouvement: validated.quantite,
        quantite_apres: validated.quantite,
        unite: validated.unite,
        note: validated.note,
        origine: "mouvement_manuel",
      })

      return NextResponse.json({ ok: true, message: "Matière ajoutée au stock avec succès" })
    }

    // Handle material movements (SORTIE, CONSOMMATION, AJUSTEMENT)
    if (
      validated.category === "matieres_premieres" &&
      (validated.type === "SORTIE" || validated.type === "CONSOMMATION" || validated.type === "AJUSTEMENT")
    ) {
      const { data: stockItem, error: fetchError } = await supabase
        .from("stock_monday_matieres")
        .select("*")
        .eq("batch_sonefi", validated.product_id)
        .single()

      if (fetchError || !stockItem) {
        console.error("[v0] Error fetching stock item:", fetchError)
        return NextResponse.json({ ok: false, error: "Lot introuvable dans le stock" }, { status: 404 })
      }

      // Handle délaizage
      if (validated.decoupe_type === "delaizage" && validated.laize_enlevee) {
        const laizeOriginale = stockItem.laize_mm ? Number(stockItem.laize_mm) : 0
        const nouvelleLaize = laizeOriginale - validated.laize_enlevee

        if (nouvelleLaize <= 0 || validated.laize_enlevee >= laizeOriginale) {
          return NextResponse.json(
            { ok: false, error: "La laize enlevée doit être inférieure à la laize d'origine" },
            { status: 400 },
          )
        }

        // Create new batch with reduced laize
        const nouveauBatch = `${stockItem.batch_sonefi}-DL-${Date.now()}`

        const { error: insertError } = await supabase.from("stock_monday_matieres").insert({
          reference_sonefi: stockItem.reference_sonefi,
          reference_sellsy: stockItem.reference_sellsy,
          batch_sonefi: nouveauBatch,
          batch_fournisseur: stockItem.batch_fournisseur,
          fournisseur: stockItem.fournisseur,
          categorie: stockItem.categorie,
          laize_mm: nouvelleLaize.toString(),
          quantite: stockItem.quantite,
          unite: stockItem.unite,
          date_entree: new Date().toISOString().split("T")[0],
          emplacement: stockItem.emplacement,
          prix_unitaire_ht: stockItem.prix_unitaire_ht,
        })

        if (insertError) {
          console.error("[v0] Error creating délaizage entry:", insertError)
          return NextResponse.json({ ok: false, error: "Erreur lors du délaizage" }, { status: 500 })
        }

        // Record in history
        await supabase.from("historique_mouvements_matieres").insert({
          type_mouvement: "DELAIZAGE",
          reference_sonefi: stockItem.reference_sonefi,
          reference_sellsy: stockItem.reference_sellsy,
          categorie_matiere: stockItem.categorie,
          batch_sonefi: nouveauBatch,
          batch_fournisseur: stockItem.batch_fournisseur,
          fournisseur: stockItem.fournisseur,
          laize_mm: nouvelleLaize,
          quantite_avant: Number(stockItem.quantite),
          quantite_mouvement: 0,
          quantite_apres: Number(stockItem.quantite),
          unite: stockItem.unite,
          type_decoupe: "delaizage",
          laize_decoupee_mm: validated.laize_enlevee,
          note:
            validated.note ||
            `Délaizage: ${laizeOriginale}mm → ${nouvelleLaize}mm (enlevé ${validated.laize_enlevee}mm)`,
          origine: "mouvement_manuel",
        })

        return NextResponse.json({
          ok: true,
          message: `Délaizage effectué avec succès. Nouveau batch: ${nouveauBatch}`,
        })
      }

      // Handle AJUSTEMENT
      if (validated.type === "AJUSTEMENT") {
        const updateData: any = {}

        if (validated.emplacement) {
          updateData.emplacement = validated.emplacement
        }

        if (validated.prixHT) {
          updateData.prix_unitaire_ht = validated.prixHT
        }

        if (validated.unite) {
          updateData.unite = validated.unite
        }

        if (Object.keys(updateData).length === 0) {
          return NextResponse.json(
            {
              ok: false,
              error: "Veuillez modifier au moins le prix ou l'emplacement pour effectuer un ajustement",
            },
            { status: 400 },
          )
        }

        const { error: updateError } = await supabase
          .from("stock_monday_matieres")
          .update(updateData)
          .eq("batch_sonefi", validated.product_id)

        if (updateError) {
          console.error("[v0] Error updating stock:", updateError)
          return NextResponse.json({ ok: false, error: "Erreur lors de l'ajustement" }, { status: 500 })
        }

        const adjustmentDetails = []
        if (validated.emplacement) adjustmentDetails.push(`Emplacement → ${validated.emplacement}`)
        if (validated.prixHT) adjustmentDetails.push(`Prix → ${validated.prixHT}€`)

        const adjustmentNote = validated.note || `Ajustement: ${adjustmentDetails.join(" | ")}`

        // Record in history - quantity is never changed in adjustments
        await supabase.from("historique_mouvements_matieres").insert({
          type_mouvement: "AJUSTEMENT",
          reference_sonefi: stockItem.reference_sonefi,
          reference_sellsy: stockItem.reference_sellsy,
          categorie_matiere: stockItem.categorie,
          batch_sonefi: stockItem.batch_sonefi,
          batch_fournisseur: stockItem.batch_fournisseur,
          fournisseur: stockItem.fournisseur,
          laize_mm: stockItem.laize_mm ? Number(stockItem.laize_mm) : null,
          quantite_avant: Number(stockItem.quantite),
          quantite_mouvement: 0, // Always 0 for adjustments - quantity never changes
          quantite_apres: Number(stockItem.quantite), // Quantity remains unchanged
          unite: validated.unite || stockItem.unite,
          note: adjustmentNote,
          origine: "mouvement_manuel",
        })

        return NextResponse.json({
          ok: true,
          message: "Ajustement effectué avec succès",
        })
      }

      // Handle SORTIE/CONSOMMATION with quantity
      if (validated.type === "SORTIE" || validated.type === "CONSOMMATION") {
        if (!validated.qty || validated.qty <= 0) {
          return NextResponse.json({ ok: false, error: "Quantité requise pour ce type de mouvement" }, { status: 400 })
        }

        const quantiteAvant = Number(stockItem.quantite)
        const newQuantity = quantiteAvant - validated.qty

        if (newQuantity < 0) {
          return NextResponse.json({ ok: false, error: "Quantité insuffisante en stock" }, { status: 400 })
        }

        const { error: updateError } = await supabase
          .from("stock_monday_matieres")
          .update({ quantite: newQuantity })
          .eq("batch_sonefi", validated.product_id)

        if (updateError) {
          console.error("[v0] Error updating stock:", updateError)
          return NextResponse.json({ ok: false, error: "Erreur lors de la mise à jour du stock" }, { status: 500 })
        }

        // Record in history
        await supabase.from("historique_mouvements_matieres").insert({
          type_mouvement: validated.type,
          reference_sonefi: stockItem.reference_sonefi,
          reference_sellsy: stockItem.reference_sellsy,
          categorie_matiere: stockItem.categorie,
          batch_sonefi: stockItem.batch_sonefi,
          batch_fournisseur: stockItem.batch_fournisseur,
          fournisseur: stockItem.fournisseur,
          laize_mm: stockItem.laize_mm ? Number(stockItem.laize_mm) : null,
          quantite_avant: quantiteAvant,
          quantite_mouvement: -validated.qty,
          quantite_apres: newQuantity,
          unite: stockItem.unite,
          type_decoupe: validated.decoupe_type === "normale" ? "normale" : null,
          note: validated.note,
          origine: "mouvement_manuel",
        })

        return NextResponse.json({
          ok: true,
          message: `Stock mis à jour. Nouvelle quantité: ${newQuantity.toFixed(2)} ${stockItem.unite || ""}`,
        })
      }
    }

    // Handle other categories (using stock_movements table)
    if (!validated.product_id) {
      return NextResponse.json({ ok: false, error: "product_id is required for this movement type" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("stock_movements")
      .insert({
        product_id: validated.product_id,
        lot_id: validated.lot_id,
        movement_type: validated.type,
        qty: validated.qty,
        note: validated.note,
      })
      .select("id")
      .single()

    if (error) {
      console.error("[v0] Error creating movement:", error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

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
