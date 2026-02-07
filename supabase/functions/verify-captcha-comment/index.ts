import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { captchaToken, documentId, content, guestName } = await req.json();

    console.log("Received comment submission request for document:", documentId);

    // Validate required fields
    if (!captchaToken || !documentId || !content) {
      console.log("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Verify hCaptcha token
    const hcaptchaSecret = Deno.env.get("HCAPTCHA_SECRET_KEY");
    if (!hcaptchaSecret) {
      console.error("HCAPTCHA_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("Verifying hCaptcha token...");
    const verifyResponse = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `response=${captchaToken}&secret=${hcaptchaSecret}`,
    });

    const verifyResult = await verifyResponse.json();
    console.log("hCaptcha verification result:", verifyResult.success);

    if (!verifyResult.success) {
      console.log("CAPTCHA verification failed");
      return new Response(
        JSON.stringify({ error: "CAPTCHA verification failed" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create Supabase client with service role for inserting guest comment
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if document allows comments
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id, allow_comments")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      console.log("Document not found:", docError);
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!document.allow_comments) {
      console.log("Comments not allowed on this document");
      return new Response(
        JSON.stringify({ error: "Comments are disabled for this document" }),
        { 
          status: 403, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Insert guest comment (null user_id for guests)
    const { data: comment, error: insertError } = await supabase
      .from("comments")
      .insert({
        document_id: documentId,
        content: content.trim(),
        guest_name: guestName?.trim() || "Guest",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting comment:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to post comment" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("Comment posted successfully:", comment.id);

    return new Response(
      JSON.stringify({ success: true, comment }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error in verify-captcha-comment:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});