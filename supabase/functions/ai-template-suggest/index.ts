import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, themeContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert invoice and document designer. Users will ask you to improve their invoice template design.

You must respond with:
1. A brief explanation of your suggestions (2-4 sentences)
2. A JSON object with the specific theme property changes

Available theme properties you can suggest changes to:
- fontFamily: one of "Inter", "DM Sans", "Roboto", "Open Sans", "Lato", "Poppins", "Nunito", "Source Sans Pro", "Merriweather", "Playfair Display"
- fontSize: 8-16
- primaryColor: hex color
- accentColor: hex color
- logoAlignment: "left", "center", or "right"
- showItemCode: boolean
- showTaxColumn: boolean
- showBankDetails: boolean
- showQrCode: boolean
- showColumnHeadings: boolean
- hideDiscount: boolean
- showUnitPriceQuantity: boolean
- topMargin: number (cm)
- bottomMargin: number (cm)
- addressPadding: number (cm)
- watermark: "" or "DRAFT" or "PAID" or "OVERDUE" or "CONFIDENTIAL"
- footerMessage: string

Respond ONLY with valid JSON in this exact format:
{
  "suggestion": "Your explanation here",
  "updates": { "propertyName": "value", ... }
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${themeContext}\n\nUser request: ${prompt}` },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the JSON response
    try {
      // Try to extract JSON from the response (may be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch {
      // Fall through to return raw suggestion
    }

    return new Response(JSON.stringify({ suggestion: content, updates: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-template-suggest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
