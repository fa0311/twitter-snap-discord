import { config } from "dotenv";

import type { z } from "zod";

export const parseEnv = async <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => {
  config();
  const parsed = await schema.safeParseAsync(process.env);
  if (parsed.success) {
    return parsed.data;
  } else {
    console.error(parsed.error.format((issue) => `Error at ${issue.path.join(".")} - ${issue.message}`));
    throw new Error("Invalid environment variables");
  }
};