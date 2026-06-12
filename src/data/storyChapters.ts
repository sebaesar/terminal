export type StoryChapter = {
  id: string;
  /** big ghost year behind the scene */
  year: string;
  /** kicker shown above the hook, e.g. "2008–2012" */
  span: string;
  /** the one memorable line */
  hook: string;
  /** the one factual line */
  sub: string;
  /** strong accent for text/borders */
  accent: string;
  /** translucent accent for the ambient background glow (must stay rgba) */
  glow: string;
};

export const STORY_TAGLINE = "I go where the work takes me.";
export const STORY_START_YEAR = "2006";
export const STORY_END_YEAR = "2026";

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: "craft",
    year: "2006",
    span: "2006–2008",
    hook: "First, learn the craft.",
    sub: "Vocational high school · Diploma in Computer Software",
    accent: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.13)",
  },
  {
    id: "theory",
    year: "2008",
    span: "2008–2012",
    hook: "Then, the theory.",
    sub: "B.Sc. Software Engineering",
    accent: "#a3e635",
    glow: "rgba(163, 230, 53, 0.13)",
  },
  {
    id: "intern",
    year: "2013",
    span: "2013–2014",
    hook: "First taste of the enterprise.",
    sub: "Intern · data organization & automation maintenance",
    accent: "#4ade80",
    glow: "rgba(74, 222, 128, 0.13)",
  },
  {
    id: "corebanking",
    year: "2015",
    span: "2015 · 9 months",
    hook: "Inside a bank's engine room.",
    sub: "Full-stack engineer · legacy core-banking migration",
    accent: "#34d399",
    glow: "rgba(52, 211, 153, 0.13)",
  },
  {
    id: "msc",
    year: "2015",
    span: "2015–2017",
    hook: "Meanwhile, the greater plan.",
    sub: "M.Sc. Software Security",
    accent: "#2dd4bf",
    glow: "rgba(45, 212, 191, 0.13)",
  },
  {
    id: "travel",
    year: "2016",
    span: "2016–2017 · 19 months",
    hook: "Bookings that cross borders.",
    sub: "Backend engineer · multinational tour & travel platform",
    accent: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.13)",
  },
  {
    id: "blueteam",
    year: "2018",
    span: "2018 · 21 months",
    hook: "Blue team, by design.",
    sub: "Software Security Engineer · MCI — security ops, automation, vulnerability management",
    accent: "#60a5fa",
    glow: "rgba(96, 165, 250, 0.13)",
  },
  {
    id: "founder1",
    year: "2019",
    span: "2019 · 8 months",
    hook: "Founder, take one.",
    sub: "Technical founder · BugDasht — a cybersecurity platform from scratch",
    accent: "#818cf8",
    glow: "rgba(129, 140, 248, 0.13)",
  },
  {
    id: "cto",
    year: "2020",
    span: "2020 · 18 months",
    hook: "Hired to steer.",
    sub: "Fractional CTO · Revision — scalability, fraud detection, reliability",
    accent: "#a78bfa",
    glow: "rgba(167, 139, 250, 0.13)",
  },
  {
    id: "defi",
    year: "2021",
    span: "2021–2024 · 36 months",
    hook: "MVP to V1, with real money on the line.",
    sub: "Senior full-stack / backend · VENT Finance — scaling DeFi, security, cloud costs",
    accent: "#c084fc",
    glow: "rgba(192, 132, 252, 0.13)",
  },
  {
    id: "builder",
    year: "2025",
    span: "2025 · 12 months",
    hook: "Shipping my own ideas.",
    sub: "Built DCPay and dTip",
    accent: "#e879f9",
    glow: "rgba(232, 121, 249, 0.13)",
  },
  {
    id: "founder2",
    year: "2026",
    span: "2026 – present",
    hook: "Founder, take two.",
    sub: "Technical founder · BlockByBlock — AI-assisted community growth, engagement, analytics",
    accent: "#fb7185",
    glow: "rgba(251, 113, 133, 0.13)",
  },
];
