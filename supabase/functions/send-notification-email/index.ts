// Supabase Edge Function: send-notification-email
// Triggered by database notification inserts to send email notifications
//
// Environment Variables Required:
// - RESEND_API_KEY: API key for Resend email service
// - SUPABASE_URL: Supabase project URL
// - SUPABASE_SERVICE_ROLE_KEY: Service role key for database access

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Notification type constants matching src/lib/constants.ts
const NOTIFICATION_TYPES: Record<number, string> = {
  0: "general",
  1: "project_created",
  2: "project_updated",
  3: "project_status_changed",
  4: "report_created",
  5: "report_approved",
  6: "estimate_created",
  7: "estimate_approved",
  8: "order_created",
  9: "shipping_updated",
  10: "invoice_marked",
  11: "receipt_marked",
  12: "fulfilled",
  13: "archived",
  14: "company_created",
  15: "company_approved",
  16: "user_invited",
  17: "invite_accepted",
  18: "bid_submitted",
  19: "bid_accepted",
  20: "message_received",
  21: "contact_submitted",
  22: "file_uploaded",
  23: "product_created",
  24: "product_updated",
  25: "estimate_shared",
};

interface NotificationPayload {
  id: number;
  receiver_id: string;
  status: number;
  description: string;
  sender_name?: string;
  project_id?: number;
  estimate_id?: number;
  estimate_reu_id?: number;
  company_id?: number;
}

interface EmailTemplate {
  subject: string;
  html: string;
}

function getEmailTemplate(
  notification: NotificationPayload,
  recipientEmail: string
): EmailTemplate {
  const notificationType = NOTIFICATION_TYPES[notification.status || 0] || "general";
  const senderName = notification.sender_name || "FocusEarth";
  const baseUrl = SUPABASE_URL?.replace(".supabase.co", "") || "https://focusearth.com";

  const templates: Record<string, EmailTemplate> = {
    estimate_created: {
      subject: `New Estimate Created - ${notification.description}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2C628D;">New Estimate Created</h2>
          <p>Hello,</p>
          <p>${senderName} has created a new estimate that requires your attention.</p>
          <p><strong>Details:</strong> ${notification.description}</p>
          <p>
            <a href="${baseUrl}/orders/suppliers/${notification.estimate_id}"
               style="display: inline-block; padding: 12px 24px; background-color: #2C628D; color: white; text-decoration: none; border-radius: 6px;">
              View Estimate
            </a>
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This is an automated notification from FocusEarth.
          </p>
        </div>
      `,
    },
    estimate_approved: {
      subject: `Estimate Approved - ${notification.description}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2C628D;">Estimate Approved</h2>
          <p>Hello,</p>
          <p>An estimate has been approved and is ready for the next step.</p>
          <p><strong>Details:</strong> ${notification.description}</p>
          <p>
            <a href="${baseUrl}/orders/suppliers/${notification.estimate_id}"
               style="display: inline-block; padding: 12px 24px; background-color: #2C628D; color: white; text-decoration: none; border-radius: 6px;">
              View Estimate
            </a>
          </p>
        </div>
      `,
    },
    order_created: {
      subject: `New Order Created - ${notification.description}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2C628D;">Order Created</h2>
          <p>Hello,</p>
          <p>An estimate has been converted to an order.</p>
          <p><strong>Details:</strong> ${notification.description}</p>
          <p>
            <a href="${baseUrl}/orders/suppliers/${notification.estimate_id}"
               style="display: inline-block; padding: 12px 24px; background-color: #2C628D; color: white; text-decoration: none; border-radius: 6px;">
              View Order
            </a>
          </p>
        </div>
      `,
    },
    shipping_updated: {
      subject: `Shipping Details Updated - ${notification.description}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2C628D;">Shipping Details Updated</h2>
          <p>Hello,</p>
          <p>Shipping information has been added or updated for your order.</p>
          <p><strong>Details:</strong> ${notification.description}</p>
          <p>
            <a href="${baseUrl}/orders/suppliers/${notification.estimate_id}"
               style="display: inline-block; padding: 12px 24px; background-color: #2C628D; color: white; text-decoration: none; border-radius: 6px;">
              View Shipping Details
            </a>
          </p>
        </div>
      `,
    },
    invoice_marked: {
      subject: `Invoice Ready - ${notification.description}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2C628D;">Invoice Ready</h2>
          <p>Hello,</p>
          <p>An invoice has been marked as ready for your order.</p>
          <p><strong>Details:</strong> ${notification.description}</p>
          <p>
            <a href="${baseUrl}/orders/suppliers/${notification.estimate_id}"
               style="display: inline-block; padding: 12px 24px; background-color: #2C628D; color: white; text-decoration: none; border-radius: 6px;">
              View Invoice
            </a>
          </p>
        </div>
      `,
    },
    fulfilled: {
      subject: `Order Fulfilled - ${notification.description}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8FCF74;">Order Fulfilled</h2>
          <p>Hello,</p>
          <p>Your order has been marked as fulfilled. All items have been delivered.</p>
          <p><strong>Details:</strong> ${notification.description}</p>
          <p>
            <a href="${baseUrl}/orders/suppliers/${notification.estimate_id}"
               style="display: inline-block; padding: 12px 24px; background-color: #8FCF74; color: white; text-decoration: none; border-radius: 6px;">
              View Order
            </a>
          </p>
          <p style="color: #666;">Thank you for your business!</p>
        </div>
      `,
    },
    user_invited: {
      subject: `You've Been Invited to FocusEarth`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2C628D;">You've Been Invited!</h2>
          <p>Hello,</p>
          <p>${senderName} has invited you to join their company on FocusEarth.</p>
          <p><strong>Details:</strong> ${notification.description}</p>
          <p>
            <a href="${baseUrl}/signup"
               style="display: inline-block; padding: 12px 24px; background-color: #2C628D; color: white; text-decoration: none; border-radius: 6px;">
              Accept Invitation
            </a>
          </p>
        </div>
      `,
    },
    estimate_shared: {
      subject: `Estimate Shared With You - ${notification.description}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2C628D;">Estimate Shared With You</h2>
          <p>Hello,</p>
          <p>${senderName} has shared an estimate with you.</p>
          <p><strong>Details:</strong> ${notification.description}</p>
          <p>
            <a href="${baseUrl}/orders/suppliers/${notification.estimate_id}"
               style="display: inline-block; padding: 12px 24px; background-color: #2C628D; color: white; text-decoration: none; border-radius: 6px;">
              View Estimate
            </a>
          </p>
        </div>
      `,
    },
    general: {
      subject: `Notification - ${notification.description}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2C628D;">Notification</h2>
          <p>Hello,</p>
          <p>${notification.description}</p>
          <p>
            <a href="${baseUrl}/dashboard"
               style="display: inline-block; padding: 12px 24px; background-color: #2C628D; color: white; text-decoration: none; border-radius: 6px;">
              Go to Dashboard
            </a>
          </p>
        </div>
      `,
    },
  };

  return templates[notificationType] || templates.general;
}

async function sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FocusEarth <notifications@focusearth.com>",
        to: [to],
        subject: template.subject,
        html: template.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Email send failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

async function getRecipientEmail(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("Failed to get recipient email:", error);
    return null;
  }

  return data.email;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { record } = await req.json();

    if (!record || !record.receiver_id) {
      return new Response(
        JSON.stringify({ error: "Invalid notification payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const notification = record as NotificationPayload;

    // Initialize Supabase client
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get recipient email
    const recipientEmail = await getRecipientEmail(supabase, notification.receiver_id);
    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: "Recipient email not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate email template
    const template = getEmailTemplate(notification, recipientEmail);

    // Send email
    const success = await sendEmail(recipientEmail, template);

    if (!success) {
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, recipient: recipientEmail }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
