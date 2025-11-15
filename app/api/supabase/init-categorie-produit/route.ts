import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Création de la table
    const { error: createError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS table_categorie_produit (
          id SERIAL PRIMARY KEY,
          reference_produit TEXT UNIQUE NOT NULL,
          designation_produit TEXT NOT NULL,
          operation_a_realiser TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_categorie_produit_reference ON table_categorie_produit(reference_produit);
      `,
    })

    if (createError) {
      console.error("Erreur création table:", createError)
    }

    // Insertion des données
    const categories = [
      {
        reference_produit: "TAPI90",
        designation_produit: "Tapis 90cm",
        operation_a_realiser: "Laize 90 - Découpe - Piquage - Finition",
      },
      {
        reference_produit: "TAPI80",
        designation_produit: "Tapis 80cm",
        operation_a_realiser: "Laize 90 - Découpe - Piquage - Finition",
      },
      {
        reference_produit: "TAPI115",
        designation_produit: "Tapis 115cm",
        operation_a_realiser: "Laize 115 - Découpe - Piquage - Finition",
      },
      {
        reference_produit: "TAPI120",
        designation_produit: "Tapis 120cm",
        operation_a_realiser: "Laize 115 - Découpe - Piquage - Finition",
      },
      {
        reference_produit: "MPA90",
        designation_produit: "Matelas Pliable Alexis 90cm",
        operation_a_realiser: "Laize 90 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPA80",
        designation_produit: "Matelas Pliable Alexis 80cm",
        operation_a_realiser: "Laize 90 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPA115",
        designation_produit: "Matelas Pliable Alexis 115cm",
        operation_a_realiser: "Laize 115 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPA120",
        designation_produit: "Matelas Pliable Alexis 120cm",
        operation_a_realiser: "Laize 115 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPANL90",
        designation_produit: "Matelas Pliable Alexis Non Lavable 90cm",
        operation_a_realiser: "Laize 90 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPANL80",
        designation_produit: "Matelas Pliable Alexis Non Lavable 80cm",
        operation_a_realiser: "Laize 90 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPANL115",
        designation_produit: "Matelas Pliable Alexis Non Lavable 115cm",
        operation_a_realiser: "Laize 115 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPANL120",
        designation_produit: "Matelas Pliable Alexis Non Lavable 120cm",
        operation_a_realiser: "Laize 115 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MAE90",
        designation_produit: "Matelas pour Aire d'éveil 90cm",
        operation_a_realiser: "Laize 90 - Découpe - Piquage - Cerclage",
      },
      {
        reference_produit: "MAE80",
        designation_produit: "Matelas pour Aire d'éveil 80cm",
        operation_a_realiser: "Laize 90 - Découpe - Piquage - Cerclage",
      },
      {
        reference_produit: "MAE115",
        designation_produit: "Matelas pour Aire d'éveil 115cm",
        operation_a_realiser: "Laize 115 - Découpe - Piquage - Cerclage",
      },
      {
        reference_produit: "MAE120",
        designation_produit: "Matelas pour Aire d'éveil 120cm",
        operation_a_realiser: "Laize 115 - Découpe - Piquage - Cerclage",
      },
      {
        reference_produit: "MPO90",
        designation_produit: "Matelas Pliable Octavius 90cm",
        operation_a_realiser: "Laize 90 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPO80",
        designation_produit: "Matelas Pliable Octavius 80cm",
        operation_a_realiser: "Laize 90 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPO115",
        designation_produit: "Matelas Pliable Octavius 115cm",
        operation_a_realiser: "Laize 115 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPO120",
        designation_produit: "Matelas Pliable Octavius 120cm",
        operation_a_realiser: "Laize 115 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPONL90",
        designation_produit: "Matelas Pliable Octavius Non Lavable 90cm",
        operation_a_realiser: "Laize 90 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPONL80",
        designation_produit: "Matelas Pliable Octavius Non Lavable 80cm",
        operation_a_realiser: "Laize 90 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPONL115",
        designation_produit: "Matelas Pliable Octavius Non Lavable 115cm",
        operation_a_realiser: "Laize 115 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPONL120",
        designation_produit: "Matelas Pliable Octavius Non Lavable 120cm",
        operation_a_realiser: "Laize 115 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPER90",
        designation_produit: "Matelas Pliable Enroulé Raphaël 90cm",
        operation_a_realiser: "Laize 90 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPER80",
        designation_produit: "Matelas Pliable Enroulé Raphaël 80cm",
        operation_a_realiser: "Laize 90 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPER115",
        designation_produit: "Matelas Pliable Enroulé Raphaël 115cm",
        operation_a_realiser: "Laize 115 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPER120",
        designation_produit: "Matelas Pliable Enroulé Raphaël 120cm",
        operation_a_realiser: "Laize 115 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MPER140",
        designation_produit: "Matelas Pliable Enroulé Raphaël 140cm",
        operation_a_realiser: "Laize 140 - Découpe - Piquage - Matelas Enroulé - Cerclage",
      },
      {
        reference_produit: "MIR55",
        designation_produit: "Miroir d'éveil - Grand Miroir 55cm",
        operation_a_realiser: "Confection",
      },
      {
        reference_produit: "MIR25",
        designation_produit: "Miroir d'éveil - Petit Miroir 25cm",
        operation_a_realiser: "Confection",
      },
    ]

    const { error: insertError } = await supabase
      .from("table_categorie_produit")
      .upsert(categories, { onConflict: "reference_produit" })

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({
      success: true,
      message: "Table créée et données insérées avec succès",
      count: categories.length,
    })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ success: false, error: "Erreur lors de la création de la table" }, { status: 500 })
  }
}
