import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Za-z]/, "Tiene que incluir una letra")
  .regex(/\d/, "Tiene que incluir un número");

// Sin caracteres confusos (0/O, 1/l/I) para que sea fácil de dictar o tipear
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePassword(length = 10): string {
  let password = "";
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    password = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  } while (!passwordSchema.safeParse(password).success);
  return password;
}