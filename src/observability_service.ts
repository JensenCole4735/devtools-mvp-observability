import { z } from "zod";
import { infrai } from "./infrai_client.ts";

export const releaseBody = z.object({
  service: z.string().min(1),
  version: z.string().min(1),
  actor: z.string().min(1),
  changedFiles: z.number().int().nonnegative()
});
export type Release = z.infer<typeof releaseBody>;

export function releaseDecision(release: Release): "observe" | "hold" {
  return release.changedFiles <= 25 ? "observe" : "hold";
}

export async function recordRelease(input: unknown) {
  const release = releaseBody.parse(input);
  const decision = releaseDecision(release);
  await infrai.metrics.report({ type: "counter", name: "release.checked", value: 1, tags: { service: release.service, decision } });
  if (decision === "hold") {
    await infrai.errors.capture({ message: "Release requires review", level: "warning", fingerprint: [release.service, "large-change"], context: release });
  }
  return { ...release, decision };
}

export async function scheduleHealthCheck(webhookUrl: string) {
  return infrai.cron.create({ cron_expr: "*/15 * * * *", task: webhookUrl });
}
