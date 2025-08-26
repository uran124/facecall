import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.192.0/crypto/mod.ts";
import { SignJWT } from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json() as {
      id: number;
      username?: string;
      photo_url?: string;
      auth_date: number;
      hash: string;
      first_name?: string;
      last_name?: string;
    };

    // Ensure auth_date is not older than 24 hours
    const now = Math.floor(Date.now() / 1000);
    if (!body.auth_date || now - Number(body.auth_date) > 60 * 60 * 24) {
      return new Response("Auth date too old", { status: 401, headers: corsHeaders });
    }

    // Ensure required env variables exist
    const requiredEnv = [
      "BOT_TOKEN",
      "SUPABASE_URL",
      "SUPABASE_SERVICE_KEY",
      "SUPABASE_JWT_SECRET",
    ];
    const missing = requiredEnv.filter((k) => !Deno.env.get(k));
    if (missing.length) {
      console.error("Missing env vars", missing);
      return new Response("Missing environment variables", {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Build data string and verify Telegram signature
    const data = Object.keys(body)
      .filter((k) => k !== "hash")
      .sort()
      .map((k) => `${k}=${body[k as keyof typeof body]}`)
      .join("\n");

    const secret = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(Deno.env.get("BOT_TOKEN")!),
    );
    const hmac = createHmac("sha256", new Uint8Array(secret))
      .update(data)
      .digest("hex");

    if (hmac !== body.hash) {
      return new Response("Invalid hash", { status: 401, headers: corsHeaders });
    }

    const userKey = `tg:${body.id}`;
    const profile = {
      user_key: userKey,
      telegram_id: body.id,
      username: body.username ?? null,
      display_name: [body.first_name, body.last_name].filter(Boolean).join(" ") || body.username || `tg_${body.id}`,
      avatar_url: body.photo_url ?? null,
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY")!;

    const upsertResp = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(profile),
    });

    if (!upsertResp.ok) {
      const text = await upsertResp.text();
      throw new Error(`Profile upsert failed: ${upsertResp.status} ${text}`);
    }

    const payload = {
      sub: userKey,
      role: "authenticated",
      telegram_id: String(body.id),
      username: body.username ?? null,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    };

    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET")!;

    const access_token = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode(jwtSecret));

    return new Response(
      JSON.stringify({ access_token, profile }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error(err);
    return new Response("Internal Server Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});

