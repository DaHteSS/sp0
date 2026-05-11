import { z } from "zod";
import { SERVER_ICON_IDS } from "@/lib/server-icon-meta";

export const createServerBodySchema = z
  .object({
    name: z.string().min(1, "Specify the name"),
    iconId: z.enum(SERVER_ICON_IDS),
    host: z.string().min(1, "Specify the host"),
    port: z.coerce.number().int().min(1).max(65535).default(22),
    username: z.string().min(1, "Specify the username"),
    useSshKey: z.boolean(),
    password: z.string().optional(),
    privateKey: z.string().optional(),
    passphrase: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.useSshKey) {
      if (!data.privateKey?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Insert the private key", path: ["privateKey"] });
      }
    }
  });
