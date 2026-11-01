import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "";

let serverClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) return null;
  if (!serverClient) {
    serverClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return serverClient;
}

export function isSupabaseConfigured(): boolean {
  return (
    !!supabaseUrl &&
    supabaseUrl.length > 0 &&
    !supabaseUrl.includes("your-project") &&
    !!supabaseKey &&
    supabaseKey.length > 0
  );
}

const BUCKET_NAME = "medical-documents";

/**
 * Upload a medical file (prescription or lab report) to Supabase private storage
 */
export async function uploadMedicalDocumentToStorage(
  userId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string,
): Promise<{ path: string | null; error: string | null }> {
  const client = getSupabaseServerClient();
  if (!client) return { path: null, error: "Supabase not configured" };

  try {
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${userId || "anonymous"}/${Date.now()}-${sanitizedName}`;

    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.warn("Supabase storage upload notice:", error.message);
      return { path: null, error: error.message };
    }

    return { path: data.path, error: null };
  } catch (err: any) {
    console.warn("Storage upload exception:", err.message || err);
    return { path: null, error: err.message || "Upload exception" };
  }
}

/**
 * Create a secure signed download/view URL for a stored document (valid for 1 hour)
 */
export async function getSignedMedicalDocumentUrl(
  storagePath: string,
  expiresInSeconds: number = 3600,
): Promise<string | null> {
  const client = getSupabaseServerClient();
  if (!client || !storagePath) return null;

  try {
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return null;
    }

    return data.signedUrl;
  } catch {
    return null;
  }
}

/**
 * Delete a document from Supabase storage
 */
export async function deleteMedicalDocumentFromStorage(
  storagePath: string,
): Promise<boolean> {
  const client = getSupabaseServerClient();
  if (!client || !storagePath) return false;

  try {
    const { error } = await client.storage.from(BUCKET_NAME).remove([storagePath]);
    return !error;
  } catch {
    return false;
  }
}
