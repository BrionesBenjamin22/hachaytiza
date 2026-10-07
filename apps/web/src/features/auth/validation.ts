import { z } from "zod";
export const emailSchema = z.string().trim().email("Ingrese un email válido.").max(254);
export const passwordSchema = z.string().min(12, "Utilice al menos 12 caracteres.").max(128, "Utilice hasta 128 caracteres.");
export const registerSchema = z.object({ name: z.string().trim().min(1, "Ingrese su nombre.").max(100), email: emailSchema, password: passwordSchema, primaryLocationId: z.string().uuid("Seleccione su localidad.") });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Ingrese su contraseña.").max(128) });
