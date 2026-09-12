import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập địa chỉ email.")
    .email("Địa chỉ email không đúng định dạng.")
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
