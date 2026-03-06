// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
// const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY"); // Future

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  try {
    const { record: proposal } = await req.json();

    if (!proposal || proposal.status !== 'active') {
       return new Response("Not a new active proposal", { status: 200 });
    }

    // In a real production app, we would use Resend/SendGrid and loop through profiles
    // For this MVP, we will just log the notification action which can be verified in the Edge Function Logs

    const { data: users, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("is_approved", true);

    if (error) throw error;

    console.log(`Sending email notification for proposal: ${proposal.title}`);
    console.log(`To ${users.length} approved members:`);
    users.forEach((u) => console.log(` - ${u.email}`));
    
    // Example Resend POST would go here:
    /*
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Flourish Fund <fund@flourish.com>",
        to: users.map(u => u.email),
        subject: `New Proposal: ${proposal.title} ($${proposal.amount})`,
        html: `<p>A new spending proposal has been created: <b>${proposal.title}</b></p><br/><a href="...">Vote Now</a>`,
      }),
    });
    */

    return new Response(JSON.stringify({ success: true, notified: users.length }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
