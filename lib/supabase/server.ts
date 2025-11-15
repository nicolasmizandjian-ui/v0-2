import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

function getSupabaseUrl(): string {
  // Try to get URL from Postgres URL
  const postgresUrl = process.env.SUPABASE_POSTGRES_URL

  if (postgresUrl) {
    // Extract project reference from postgres URL
    // Format: postgresql://postgres.[project-ref]:[password]@...
    const match = postgresUrl.match(/postgres\.([^:]+):/)
    if (match) {
      const projectRef = match[1]
      const url = `https://${projectRef}.supabase.co`
      return url
    }
  }
  throw new Error("Could not determine Supabase URL from environment variables")
}

export async function createClient() {
  const cookieStore = await cookies()

  const serviceRoleKey = process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SUPABASE_SERVICE_ROLE_KEY is required for server-side queries")
  }

  return createServerClient(getSupabaseUrl(), serviceRoleKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}
