import { OTP_MAX_AGE_SECONDS } from "@/lib/otp";

const minutes = OTP_MAX_AGE_SECONDS / 60;

export function otpEmail(code: string) {
  const subject = `${code} é seu código de acesso ao Ascend`;

  const text = [
    `Seu código de acesso ao Ascend é: ${code}`,
    "",
    `Ele expira em ${minutes} minutos.`,
    "Se você não pediu este código, ignore este email.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#171717">
    <table role="presentation" width="100%" style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <tr><td>
        <p style="margin:0 0 8px;font-size:16px">Seu código de acesso ao <strong>Ascend</strong>:</p>
        <p style="margin:16px 0;font-size:36px;font-weight:bold;letter-spacing:8px;font-family:'Courier New',monospace">${code}</p>
        <p style="margin:0 0 4px;font-size:14px;color:#525252">Ele expira em ${minutes} minutos.</p>
        <p style="margin:0;font-size:14px;color:#525252">Se você não pediu este código, ignore este email.</p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
