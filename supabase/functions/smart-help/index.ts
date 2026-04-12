import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currentPage, userQuestion } = await req.json();

    const pageContextMap: Record<string, string> = {
      '/': 'Dashboard/Overview page - shows KPI cards (drafts, sent, overdue, paid invoices), revenue summary, recent invoices. Cards are clickable and navigate to filtered views.',
      '/invoices': 'Invoices list page - shows all invoices with status filters, search, bulk actions, sortable columns. Click a row to view the invoice. Use "New" button in header to create.',
      '/invoices/new': 'Create Invoice page - fill in customer details, add line items, set due date and payment terms. Has live preview on desktop. Can Save as Draft or Save & Send.',
      '/customers': 'Customers page - manage customer contacts. Add new customers, edit existing ones, view customer details.',
      '/companies': 'Companies page - manage your business entities. Click a company card to expand and edit. Add new companies with the Add Company button.',
      '/quotes': 'Quotes page - create and manage quotations for customers before converting to invoices.',
      '/products': 'Products & Services page - manage your product/service catalog with prices, codes, and tax rates.',
      '/expenses': 'Expenses page - track business expenses, categorize them, mark as billable to customers.',
      '/reports': 'Reports page - view financial reports with charts, revenue breakdown, profit & loss. Use date range filter to adjust timeframe.',
      '/settings': 'Settings page - configure global settings like banking details, terms & conditions, VAT settings, late fees.',
      '/credit-notes': 'Credit Notes page - issue credit notes against invoices for refunds or corrections.',
      '/team': 'Team page - manage team members, invite new users, set roles and permissions.',
      '/customer-statements': 'Customer Statements page - generate account statements for customers showing all transactions.',
      '/online-payments': 'Online Payments page - configure payment gateways for customers to pay invoices online.',
      '/vat-report': 'VAT Report page - view VAT/tax reports for a selected period.',
    };

    const matchedPage = Object.entries(pageContextMap).find(([path]) => {
      if (path === '/') return currentPage === '/';
      return currentPage.startsWith(path);
    });

    const pageContext = matchedPage?.[1] || `Page: ${currentPage}`;

    const systemPrompt = `You are a helpful in-app assistant for RayVo, an invoicing and business management application. 
You provide clear, concise step-by-step guidance to help users accomplish tasks.

Current page context: ${pageContext}

Guidelines:
- Give numbered step-by-step instructions
- Be concise — max 5-6 steps per answer
- Reference specific UI elements (buttons, menus, fields) by name
- If the user's question isn't related to the current page, guide them to the right page first
- Use friendly, encouraging tone
- If you don't know something specific, say so honestly

Available pages in the app: Dashboard, Invoices, Quotes, Credit Notes, Customers, Statements, Products, Expenses, Online Payments, Companies, Reports, VAT Report, Team, Activity Log, Settings.

Key features: Create/edit/send invoices, manage customers, track expenses, generate reports, manage multiple companies, team collaboration, online payments, recurring invoices, branding themes.`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuestion || "What can I do on this page? Give me a quick guide." },
        ],
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate help right now. Please try again.";

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
