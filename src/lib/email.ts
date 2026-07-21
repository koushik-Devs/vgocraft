/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM || "onboarding@resend.dev";

  if (!apiKey) {
    console.log(`
======================================================
📧 [SIMULATED EMAIL SENT]
To: ${to}
Subject: ${subject}
From: ${fromEmail}
Body (HTML):
------------------------------------------------------
${html.replace(/<[^>]*>/g, " ").trim().substring(0, 500)}...
======================================================
    `);
    return true;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `VgoCraft <${fromEmail}>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (res.ok) {
      console.log(`✅ Email successfully sent to ${to} using Resend.`);
      return true;
    } else {
      const errText = await res.text();
      console.error("❌ Resend API Error:", errText);
      return false;
    }
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    return false;
  }
}

// Pre-defined template functions
export const emailTemplates = {
  welcome: (name: string, verifyLink: string) => ({
    subject: "Welcome to VgoCraft! Please Verify Your Email",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #0f172a; text-align: center;">Welcome to VgoCraft</h2>
        <p>Hi ${name},</p>
        <p>Thank you for registering on VgoCraft - Professional Academic Writing & Research Assistance Platform.</p>
        <p>Please verify your email address to activate your account and start placing orders:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">If the button above does not work, copy and paste this link into your browser:</p>
        <p style="color: #2563eb; font-size: 14px; word-break: break-all;">${verifyLink}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">VgoCraft Support - koushikmondal.me@outlook.com</p>
      </div>
    `,
  }),

  forgotPassword: (name: string, resetLink: string) => ({
    subject: "Reset Your VgoCraft Password",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #0f172a; text-align: center;">Reset Your Password</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password on VgoCraft. Click the link below to set up a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #dc2626; font-size: 14px; font-weight: 500;">Note: This link will expire in 15 minutes.</p>
        <p style="color: #64748b; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">VgoCraft Support - koushikmondal.me@outlook.com</p>
      </div>
    `,
  }),

  orderSubmitted: (orderId: string, total: number) => ({
    subject: `Order Submitted - Awaiting Verification [${orderId}]`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #0f172a; text-align: center;">Order Submitted Successfully</h2>
        <p>Your order <strong>${orderId}</strong> has been successfully registered on VgoCraft.</p>
        <p><strong>Total Price:</strong> ₹${total}</p>
        <p>Since you have uploaded your payment screenshot, our administrator is manually verifying your payment. Once approved, work will begin immediately!</p>
        <p>We will notify you by email as soon as your payment is approved and work begins.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">VgoCraft Support - koushikmondal.me@outlook.com</p>
      </div>
    `,
  }),

  paymentApproved: (orderId: string) => ({
    subject: `Payment Approved & Work Started [${orderId}]`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #16a34a; text-align: center;">Payment Approved</h2>
        <p>Great news! The administrator has verified and approved your UPI payment for order <strong>${orderId}</strong>.</p>
        <p>Our professional academic writers have officially started working on your assignment. You can track the real-time progress inside your Client Dashboard.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">VgoCraft Support - koushikmondal.me@outlook.com</p>
      </div>
    `,
  }),

  orderCompleted: (orderId: string, downloadLink: string) => ({
    subject: `Your Assignment is Completed! [${orderId}]`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #16a34a; text-align: center;">Assignment Completed!</h2>
        <p>Excellent news! Your assignment for order <strong>${orderId}</strong> has passed our quality check and is fully completed.</p>
        <p>You can now download your final files directly from your VgoCraft dashboard, or use the link below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${downloadLink}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download Completed Files</a>
        </div>
        <p>If you require any revisions, you can submit a "Revision Request" within 7 days from your dashboard.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">VgoCraft Support - koushikmondal.me@outlook.com</p>
      </div>
    `,
  }),

  supportReply: (ticketId: string, subjectLine: string, replyMessage: string) => ({
    subject: `New Reply to Ticket [${ticketId}] - ${subjectLine}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #0f172a;">New Support Ticket Reply</h2>
        <p>You have received a new reply from VgoCraft Support regarding ticket <strong>${ticketId}</strong>:</p>
        <blockquote style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; color: #334155;">
          ${replyMessage}
        </blockquote>
        <p>Please log into your dashboard to reply or view the ticket history.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">VgoCraft Support - koushikmondal.me@outlook.com</p>
      </div>
    `,
  }),
};
