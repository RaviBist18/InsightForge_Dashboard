import { z } from "zod";

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "co-admin", "member"]),
  companyId: z.string().uuid(),
  companyName: z.string().optional(),
});

export const joinRequestApproveSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
});
export const findCompanySchema = z.object({
  email: z.string().email(),
});

export const aiChatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
      }),
    )
    .optional(),
  systemPrompt: z.string().optional(),
});

export function parseOrError<T extends z.ZodTypeAny>(schema: T, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { data: null, error: result.error.flatten() };
  }
  return { data: result.data as z.infer<T>, error: null };
}
