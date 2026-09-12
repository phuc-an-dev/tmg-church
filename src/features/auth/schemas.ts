import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required.")
    .email("Please enter a valid email address.")
    .toLowerCase(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type LoginActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: {
    email?: string[];
  };
};

export const initialLoginState: LoginActionState = {
  status: "idle",
};
