import { z } from "zod";

/** Hesap açılabilen tek e-posta alan adı */
export const EMAIL_DOMAIN = "havelsan.com.tr";

export const EMAIL_DOMAIN_ERROR = `Sadece @${EMAIL_DOMAIN} uzantılı e-posta adresleri kabul edilir.`;

export function isAllowedEmail(email: string) {
  return email.endsWith(`@${EMAIL_DOMAIN}`);
}

/** Küçük harfe çevrilmiş, geçerli ve @havelsan.com.tr ile biten e-posta */
export function emailField(invalidMessage = "Geçerli bir e-posta girin") {
  return z.string().trim().toLowerCase().email(invalidMessage).refine(isAllowedEmail, EMAIL_DOMAIN_ERROR);
}
