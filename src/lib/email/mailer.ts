import "server-only";

import { createTransport, type Transporter } from "nodemailer";

type Mail = { to: string; subject: string; text: string; html: string };

let transporter: Transporter | undefined;

function gmailConfig() {
  const user = process.env.GMAIL_OAUTH_USER;
  const clientId = process.env.GMAIL_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_OAUTH_REFRESH_TOKEN;
  if (!user || !clientId || !clientSecret || !refreshToken) return null;
  return { user, clientId, clientSecret, refreshToken };
}

function getTransporter(auth: NonNullable<ReturnType<typeof gmailConfig>>) {
  transporter ??= createTransport({
    service: "gmail",
    auth: { type: "OAuth2", ...auth },
  });
  return transporter;
}

/**
 * Envia pelo Gmail (OAuth2). Em desenvolvimento, sem credenciais configuradas,
 * apenas loga o email no console.
 */
export async function sendMail(mail: Mail) {
  const config = gmailConfig();

  if (!config) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Credenciais do Gmail (GMAIL_OAUTH_*) não configuradas.");
    }
    console.info(`\n[email] para ${mail.to}\n${mail.text}\n`);
    return;
  }

  const result = await getTransporter(config).sendMail({
    from: process.env.EMAIL_FROM ?? config.user,
    ...mail,
  });
  if (result.rejected?.length) {
    throw new Error("Falha ao enviar o email.");
  }
}
