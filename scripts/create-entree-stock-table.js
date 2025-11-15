import postgres from "postgres"

const sql = postgres(process.env.SUPABASE_POSTGRES_URL)

async function createEntreeStockTable() {
  try {
    console.log("[v0] Connexion à Supabase...")

    // Créer la table ENTREE_STOCK
    await sql`
      CREATE TABLE IF NOT EXISTS ENTREE_STOCK (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Informations commande
        code_commande TEXT,
        acheteur TEXT,
        numero_commande TEXT,
        
        -- Informations produit
        ref_sellsy TEXT,
        fournisseur TEXT,
        description_produit TEXT,
        
        -- Quantités et unités
        quantite_produit DECIMAL,
        unite TEXT,
        
        -- Classification et localisation
        categorie TEXT,
        emplacement TEXT,
        
        -- Dates
        date_commande DATE,
        date_entree_stock DATE,
        
        -- Identifiant Monday (pour la synchronisation)
        identifiant_element TEXT UNIQUE
      )
    `

    console.log("[v0] ✅ Table ENTREE_STOCK créée avec succès !")

    // Créer des index pour optimiser les requêtes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_entree_stock_fournisseur 
      ON ENTREE_STOCK(fournisseur)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_entree_stock_date_entree 
      ON ENTREE_STOCK(date_entree_stock)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_entree_stock_identifiant 
      ON ENTREE_STOCK(identifiant_element)
    `

    console.log("[v0] ✅ Index créés avec succès !")

    // Vérifier que la table existe
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'entree_stock'
    `

    if (result.length > 0) {
      console.log("[v0] ✅ Vérification : La table ENTREE_STOCK existe bien dans la base de données")
    }

    await sql.end()
  } catch (error) {
    console.error("[v0] ❌ Erreur lors de la création de la table:", error.message)
    await sql.end()
    throw error
  }
}

createEntreeStockTable()
