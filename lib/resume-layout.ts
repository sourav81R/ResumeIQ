export const RESUME_LAYOUT = {
  pageWidth: 595.28,
  pageHeight: 841.89,
  margin: 34,
  photoSize: 78,
  headerGap: 16,
  font: {
    name: 20,
    role: 11.6,
    contact: 10.1,
    link: 9.8,
    sectionTitle: 11.2,
    body: 10.4,
    bodyTight: 10.1,
    meta: 9.6
  },
  lineGap: {
    name: 2.4,
    role: 2.2,
    contact: 2,
    sectionTitle: 1.8,
    body: 2.2,
    tight: 2.1,
    meta: 2
  }
} as const;

export function resumeContentWidth() {
  return RESUME_LAYOUT.pageWidth - RESUME_LAYOUT.margin * 2;
}
