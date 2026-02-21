export const JOB_DESCRIPTION_PREVIEW_EVENT = "resumeiq:job-description-updated";

export type JobDescriptionPreviewDetail = {
  jobDescriptionText: string;
};

export function dispatchJobDescriptionPreviewUpdate(jobDescriptionText: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<JobDescriptionPreviewDetail>(JOB_DESCRIPTION_PREVIEW_EVENT, {
      detail: {
        jobDescriptionText: String(jobDescriptionText || "")
      }
    })
  );
}
