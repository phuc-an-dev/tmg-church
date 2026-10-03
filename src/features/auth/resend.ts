import "server-only";
import { getSiteUrl } from "@/lib/env";

type InvitationEmail = {
  email: string;
  token: string;
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

function getResendConfig(): { apiKey: string; from: string } {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    throw new Error("Resend invitation email is not configured.");
  }
  return { apiKey, from };
}

export async function sendMemberInvitationEmail({
  email,
  token,
}: InvitationEmail): Promise<void> {
  const activationUrl = `${getSiteUrl()}/activate?token=${encodeURIComponent(token)}`;

  // Local development without Resend credentials: log the activation link
  // instead of sending, so the invitation flow stays testable end to end.
  if (
    process.env.NODE_ENV !== "production" &&
    !process.env.RESEND_API_KEY?.trim()
  ) {
    console.info(
      `[dev] Invitation email skipped for ${email}. Activation link (valid 15 minutes): ${activationUrl}`,
    );
    return;
  }

  const { apiKey, from } = getResendConfig();
  const safeUrl = escapeHtml(activationUrl);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your TMG Church account invitation",
      html: `<p>You have been invited to access TMG Church.</p><p><a href="${safeUrl}">Activate your account</a></p><p>This invitation expires in 15 minutes and can only be used once.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error("Resend rejected the invitation email.");
  }
}
