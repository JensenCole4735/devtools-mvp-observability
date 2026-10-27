import { recordRelease, scheduleHealthCheck } from "./observability_service.ts";

const release = await recordRelease({ service: "api", version: "2026.10.23", actor: "founder", changedFiles: 8 });
console.log(JSON.stringify(release));
if (process.env.HEALTHCHECK_URL) {
  const job = await scheduleHealthCheck(process.env.HEALTHCHECK_URL);
  console.log(JSON.stringify({ job_id: job.job_id }));
}
