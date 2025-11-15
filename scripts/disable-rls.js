import { createClient } from "@supabase/supabase-js"

function getSupabaseUrl() {
  const postgresUrl = process.env.SUPABASE_POSTGRES_URL
  if (!postgresUrl) {
    throw new Error("SUPABASE_POSTGRES_URL not found")
  }

  // Extract project reference from postgres URL
  // Format: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@[HOST]:[PORT]/postgres
  const match = postgresUrl.match(/postgres\.([^:]+):/)
  if (!match) {
    throw new Error("Could not extract project reference from POSTGRES_URL")
  }

  const projectRef = match[1]
  return `https://${projectRef}.supabase.co`
}

async function disableRLS() {
  try {
    console.log("[v0] Starting RLS disable script...")

    const supabaseUrl = getSupabaseUrl()
    const supabaseKey = process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseKey) {
      throw new Error("SUPABASE_SUPABASE_SERVICE_ROLE_KEY not found")
    }

    console.log("[v0] Connecting to Supabase...")
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Disable RLS on all three tables
    const tables = ["ATELIER_MONDAY", "STOCK_MONDAY", "ENTREE_STOCK"]

    for (const table of tables) {
      console.log(`[v0] Disabling RLS on ${table}...`)

      const { error } = await supabase.rpc("exec_sql", {
        sql: `ALTER TABLE public."${table}" DISABLE ROW LEVEL SECURITY;`,
      })

      if (error) {
        console.error(`[v0] Error disabling RLS on ${table}:`, error)
        // Try alternative method using direct SQL
        const { error: altError } = await supabase.from(table).select("*").limit(1)
        console.log(`[v0] Testing access to ${table}:`, altError ? "FAILED" : "SUCCESS")
      } else {
        console.log(`[v0] Successfully disabled RLS on ${table}`)
      }
    }

    console.log("[v0] RLS disable script completed!")
    console.log("[v0] Please go to Supabase SQL Editor and run:")
    console.log('[v0] ALTER TABLE public."ATELIER_MONDAY" DISABLE ROW LEVEL SECURITY;')
    console.log('[v0] ALTER TABLE public."STOCK_MONDAY" DISABLE ROW LEVEL SECURITY;')
    console.log('[v0] ALTER TABLE public."ENTREE_STOCK" DISABLE ROW LEVEL SECURITY;')
  } catch (error) {
    console.error("[v0] Error in RLS disable script:", error)
    throw error
  }
}

disableRLS()
