import { OptimizedResumeContent, ResumeTemplate } from "@/types";

type PreviewProfile = "general" | "healthcare" | "student" | "creative" | "customer-service" | "academic";

const SAMPLE_PROFILE_PHOTO_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 320'><defs><linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#0ea5e9'/><stop offset='100%' stop-color='#155e75'/></linearGradient></defs><rect width='320' height='320' fill='url(#bg)'/><circle cx='160' cy='122' r='68' fill='#ffffff' fill-opacity='0.92'/><path d='M60 296c12-58 55-92 100-92s88 34 100 92' fill='#ffffff' fill-opacity='0.92'/></svg>`;
export const SAMPLE_PROFILE_PHOTO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(SAMPLE_PROFILE_PHOTO_SVG)}`;

const PREVIEW_CONTENT_BY_PROFILE: Record<PreviewProfile, OptimizedResumeContent> = {
  general: {
    header: {
      name: "Jordan Patel",
      role: "Senior Operations Analyst",
      email: "jordan.patel@email.com",
      phone: "+1 (415) 555-0138",
      location: "San Francisco, CA",
      links: ["linkedin.com/in/jordanpatel", "portfolio.jordanpatel.dev"]
    },
    summary:
      "Data-driven operations professional with 7+ years improving service reliability, process efficiency, and reporting quality across cross-functional teams. Known for translating business goals into measurable execution plans.",
    experience: [
      {
        company: "Northline Systems",
        role: "Senior Operations Analyst",
        location: "San Francisco, CA",
        startDate: "Apr 2021",
        endDate: "Present",
        bullets: [
          "Built KPI dashboards that reduced incident response time by 34% across 5 support teams.",
          "Led workflow redesign for ticket triage, increasing first-contact resolution from 68% to 84%.",
          "Partnered with finance and product to align quarterly planning against SLA and cost targets."
        ]
      },
      {
        company: "AxisPoint Services",
        role: "Operations Analyst",
        location: "Remote",
        startDate: "Jan 2018",
        endDate: "Mar 2021",
        bullets: [
          "Automated recurring reporting in SQL + Sheets, saving 11 hours of manual work weekly.",
          "Created onboarding SOPs adopted by 3 regional teams and improved ramp-up consistency."
        ]
      }
    ],
    education: [
      {
        institution: "San Jose State University",
        degree: "B.S. in Business Analytics",
        startDate: "2013",
        endDate: "2017",
        details: ["Graduated with Honors", "Capstone: Service Process Optimization"]
      }
    ],
    projects: [
      {
        name: "Ops Pulse Dashboard",
        role: "Lead Analyst",
        tech: ["SQL", "Looker Studio", "Apps Script"],
        link: "ops-pulse.example.com",
        bullets: [
          "Unified 9 data sources into one executive dashboard with weekly health snapshots.",
          "Introduced forecast alerts that improved staffing allocation during peak periods."
        ]
      }
    ],
    skills: {
      core: ["Process Optimization", "SLA Management", "KPI Strategy", "Cross-Functional Leadership"],
      tools: ["SQL", "Looker Studio", "Excel", "Google Apps Script", "Jira"],
      soft: ["Stakeholder Communication", "Problem Solving", "Execution Discipline"]
    },
    certifications: ["Lean Six Sigma Green Belt", "Google Data Analytics Certificate"]
  },
  healthcare: {
    header: {
      name: "Aarav Mehta",
      role: "Clinical Operations Coordinator",
      email: "aarav.mehta@email.com",
      phone: "+1 (617) 555-0182",
      location: "Boston, MA",
      links: ["linkedin.com/in/aaravmehta", "aarav-career-site.example.com"]
    },
    summary:
      "Healthcare operations coordinator with 6+ years supporting patient access, compliance workflows, and interdisciplinary care teams. Strong record of improving scheduling efficiency and documentation quality in high-volume environments.",
    experience: [
      {
        company: "Boston Community Health",
        role: "Clinical Operations Coordinator",
        location: "Boston, MA",
        startDate: "May 2020",
        endDate: "Present",
        bullets: [
          "Improved appointment utilization by 22% through waitlist logic and schedule balancing.",
          "Coordinated referral and follow-up workflows for 40+ clinicians and nursing staff.",
          "Reduced chart closure backlog by 31% by streamlining post-visit documentation checks."
        ]
      },
      {
        company: "Mercy Family Clinic",
        role: "Patient Services Specialist",
        location: "Cambridge, MA",
        startDate: "Jul 2017",
        endDate: "Apr 2020",
        bullets: [
          "Handled 90+ weekly patient interactions while maintaining high service quality scores.",
          "Supported insurance verification and prior authorization tasks with near-zero error rates."
        ]
      }
    ],
    education: [
      {
        institution: "Northeastern University",
        degree: "B.S. in Health Science",
        startDate: "2013",
        endDate: "2017",
        details: ["Minor in Public Health", "Dean's List, 4 semesters"]
      }
    ],
    projects: [],
    skills: {
      core: ["Patient Coordination", "Clinical Scheduling", "HIPAA Compliance", "EMR Documentation"],
      tools: ["Epic", "Cerner", "Microsoft Excel", "Google Workspace"],
      soft: ["Empathy", "Attention to Detail", "Team Collaboration"]
    },
    certifications: ["BLS - American Heart Association", "Certified Medical Administrative Assistant (CMAA)"]
  },
  student: {
    header: {
      name: "Neha Singh",
      role: "Computer Science Student",
      email: "neha.singh@email.com",
      phone: "+1 (972) 555-0155",
      location: "Dallas, TX",
      links: ["github.com/nehasingh-dev", "linkedin.com/in/nehasingh"]
    },
    summary:
      "Final-year computer science student focused on backend development and practical product building. Delivered internship and class projects with measurable reliability, performance, and user experience improvements.",
    experience: [
      {
        company: "Vertex Labs",
        role: "Software Engineering Intern",
        location: "Remote",
        startDate: "Jun 2025",
        endDate: "Aug 2025",
        bullets: [
          "Implemented API caching and improved average response time by 27% on key endpoints.",
          "Added integration tests for auth and profile services, preventing 3 recurring regressions."
        ]
      }
    ],
    education: [
      {
        institution: "University of Texas at Dallas",
        degree: "B.S. in Computer Science",
        startDate: "2022",
        endDate: "2026",
        details: ["CGPA: 3.8/4.0", "Relevant Coursework: DBMS, OS, Distributed Systems"]
      }
    ],
    projects: [
      {
        name: "Campus Mentor Match",
        role: "Full-Stack Developer",
        tech: ["Next.js", "TypeScript", "Firebase", "Tailwind CSS"],
        link: "mentor-match-demo.example.com",
        bullets: [
          "Built role-based matching flows for mentors and mentees with secure auth.",
          "Shipped analytics tracking to measure successful mentor sessions and retention."
        ]
      }
    ],
    skills: {
      core: ["Backend Development", "REST API Design", "System Design Basics", "Data Structures"],
      tools: ["TypeScript", "Node.js", "PostgreSQL", "Firebase", "Git"],
      soft: ["Ownership", "Communication", "Fast Learning"]
    },
    certifications: ["AWS Cloud Practitioner", "Meta Back-End Developer"]
  },
  creative: {
    header: {
      name: "Maya Brooks",
      role: "Visual Designer and Photographer",
      email: "maya.brooks@email.com",
      phone: "+1 (323) 555-0179",
      location: "Los Angeles, CA",
      links: ["mayabrooks.studio", "instagram.com/mayabrooks.creative"]
    },
    summary:
      "Creative professional blending visual design, photography, and brand storytelling. Experienced in delivering campaigns across digital and print with a focus on audience engagement and brand consistency.",
    experience: [
      {
        company: "Golden Hour Studio",
        role: "Lead Visual Designer",
        location: "Los Angeles, CA",
        startDate: "Mar 2022",
        endDate: "Present",
        bullets: [
          "Directed visual identity updates for 12 clients, lifting social engagement by up to 40%.",
          "Produced campaign assets across web, email, and print under tight launch timelines.",
          "Managed freelance photographer network and maintained consistent brand quality."
        ]
      },
      {
        company: "Frameworks Media",
        role: "Photographer",
        location: "Los Angeles, CA",
        startDate: "May 2019",
        endDate: "Feb 2022",
        bullets: [
          "Shot and edited editorial and commercial projects for consumer lifestyle brands.",
          "Improved post-production throughput by standardizing Lightroom and Photoshop workflows."
        ]
      }
    ],
    education: [
      {
        institution: "ArtCenter College of Design",
        degree: "B.F.A. in Graphic Design",
        startDate: "2015",
        endDate: "2019",
        details: ["Portfolio Distinction", "Visual Storytelling Focus"]
      }
    ],
    projects: [
      {
        name: "City Lights Series",
        role: "Creative Director",
        tech: ["Adobe Lightroom", "Adobe Photoshop", "Figma"],
        link: "mayabrooks.studio/city-lights",
        bullets: [
          "Produced a 24-image narrative series licensed by two local publications.",
          "Designed companion microsite to present story context and behind-the-scenes process."
        ]
      }
    ],
    skills: {
      core: ["Creative Direction", "Brand Storytelling", "Photo Composition", "Visual Identity"],
      tools: ["Adobe Photoshop", "Lightroom", "Illustrator", "Figma", "Canva"],
      soft: ["Client Collaboration", "Creative Problem Solving", "Presentation"]
    },
    certifications: ["Adobe Certified Professional - Visual Design"]
  },
  "customer-service": {
    header: {
      name: "Olivia Ramirez",
      role: "Customer Success Specialist",
      email: "olivia.ramirez@email.com",
      phone: "+1 (512) 555-0141",
      location: "Austin, TX",
      links: ["linkedin.com/in/oliviaramirez", "olivia-cs-portfolio.example.com"]
    },
    summary:
      "Customer success specialist with proven success in retention, escalation handling, and service process improvement. Delivers consistent customer outcomes through empathy, clear communication, and data-informed action plans.",
    experience: [
      {
        company: "BrightDesk SaaS",
        role: "Customer Success Specialist",
        location: "Austin, TX",
        startDate: "Jan 2021",
        endDate: "Present",
        bullets: [
          "Raised renewal rate from 82% to 91% across a managed portfolio of 120 SMB accounts.",
          "Designed proactive outreach playbooks that reduced ticket escalations by 29%.",
          "Built onboarding health checks that cut time-to-value for new accounts by 18%."
        ]
      }
    ],
    education: [
      {
        institution: "Texas State University",
        degree: "B.B.A. in Marketing",
        startDate: "2014",
        endDate: "2018",
        details: ["Customer Experience Track"]
      }
    ],
    projects: [],
    skills: {
      core: ["Customer Retention", "Onboarding Strategy", "Escalation Management", "Journey Mapping"],
      tools: ["HubSpot", "Zendesk", "Salesforce", "Google Sheets"],
      soft: ["Conflict Resolution", "Active Listening", "Stakeholder Alignment"]
    },
    certifications: ["HubSpot Customer Success Certification"]
  },
  academic: {
    header: {
      name: "Dr. Ethan Cole",
      role: "Research Associate - Data and Policy",
      email: "ethan.cole@email.com",
      phone: "+1 (202) 555-0199",
      location: "Washington, DC",
      links: ["scholar.google.com/ethancole", "linkedin.com/in/ethancole"]
    },
    summary:
      "Research associate specializing in applied policy analytics, mixed-method evaluation, and publication-quality reporting. Experienced in translating complex findings into decision-ready recommendations for institutional stakeholders.",
    experience: [
      {
        company: "Policy Insight Lab",
        role: "Research Associate",
        location: "Washington, DC",
        startDate: "Sep 2020",
        endDate: "Present",
        bullets: [
          "Led quantitative analysis for 6 multi-year projects covering workforce and education policy.",
          "Co-authored 4 peer-reviewed papers and 9 public-facing policy briefs.",
          "Developed reproducible data pipelines to ensure audit-ready research workflows."
        ]
      }
    ],
    education: [
      {
        institution: "Georgetown University",
        degree: "Ph.D. in Public Policy",
        startDate: "2015",
        endDate: "2020",
        details: ["Dissertation: Causal Evaluation in Labor Programs", "Graduate Teaching Fellow"]
      },
      {
        institution: "University of Michigan",
        degree: "B.A. in Economics",
        startDate: "2011",
        endDate: "2015",
        details: ["Magna Cum Laude"]
      }
    ],
    projects: [
      {
        name: "Evidence Dashboard for Workforce Grants",
        role: "Research Lead",
        tech: ["R", "Python", "Tableau"],
        bullets: [
          "Combined national and state datasets into a benchmark model used by policy teams.",
          "Improved reporting cycle times from 4 weeks to 9 days through standardized scripts."
        ]
      }
    ],
    skills: {
      core: ["Policy Analysis", "Causal Inference", "Mixed Methods", "Academic Writing"],
      tools: ["R", "Python", "Stata", "Tableau", "LaTeX"],
      soft: ["Public Speaking", "Mentoring", "Stakeholder Briefing"]
    },
    certifications: []
  }
};

const PREVIEW_PROFILE_BY_TEMPLATE_ID: Partial<Record<string, PreviewProfile>> = {
  "canva-blue-health-photo": "healthcare",
  "canva-green-health-photo": "healthcare",
  "canva-orange-photo-header-customer-service": "customer-service",
  "canva-yellow-photo-header-college": "student",
  "canva-navy-orange-simple-college": "student",
  "canva-black-simple-lines-college": "student",
  "canva-white-minimal-academic": "academic",
  "canva-mountain-photographer-photo": "creative",
  "canva-black-yellow-photography-photo": "creative",
  "canva-yellow-photographer-creative": "creative",
  "canva-turquoise-acting-photo": "creative",
  "canva-minimal-multimedia-artist-photo": "creative",
  "canva-bright-pink-modern-photo": "creative",
  "canva-colorful-gradient-designer": "creative"
};

function clonePreviewContent(content: OptimizedResumeContent) {
  return JSON.parse(JSON.stringify(content)) as OptimizedResumeContent;
}

export function buildTemplatePreviewContent(template: ResumeTemplate): OptimizedResumeContent {
  const profile = PREVIEW_PROFILE_BY_TEMPLATE_ID[template.id] || "general";
  const content = clonePreviewContent(PREVIEW_CONTENT_BY_PROFILE[profile]);

  if (template.photoMode === "with-photo") {
    content.header.photoUrl = SAMPLE_PROFILE_PHOTO_DATA_URL;
  } else {
    delete content.header.photoUrl;
  }

  return content;
}
