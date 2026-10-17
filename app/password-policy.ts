export const PASSWORD_REQUIREMENTS = "Mínimo 8 caracteres, con al menos una letra mayúscula y un número. Combiná letras y números.";
export const PASSWORD_PATTERN = "(?=.*\\p{Lu})(?=.*[0-9]).{8,}";
export function validateNewPassword(password: string, confirmation: string): string {
  if (password.length < 8 || !/\p{Lu}/u.test(password) || !/[0-9]/.test(password)) return PASSWORD_REQUIREMENTS;
  if (new TextEncoder().encode(password).length > 72) return "La contraseña supera el límite de 72 bytes.";
  return password === confirmation ? "" : "Las contraseñas no coinciden.";
}
