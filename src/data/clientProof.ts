import type { ClientProofItem } from "@types";

export const CLIENT_PROOF_TITLE =
  "Experiences";

export const CLIENT_PROOF_ITEMS: ClientProofItem[] = [
  {
    slug: "blockbyblock",
    name: "BlockByBlock",
    logoPath: "images/proof/clients/bbb.png",
    mission: "Turn a single-paragraph AI community idea into investor-ready product proof.",
    outcome: "Shipped MVP in 10 days (With AI), avoided about $10K in wasted build spend, and set clear backend boundaries for a 5,000-user waitlist.",
  },
  {
    slug: "vexor",
    name: "Vexor Network",
    logoPath: "images/proof/clients/vexor.png",
    mission: "Harden a pre-beta Web3 reputation frontend, backend, release path, and observability baseline.",
    outcome: "Improved API response times about 40%, added abuse controls and alerts, and supported a stable beta launch with no major incidents reported.",
  },
  {
    slug: "vent",
    name: "VENT Finance",
    logoPath: "images/proof/clients/vent.png",
    mission: "Secure and operate a digital asset investment and launch platform across contracts, backend workflows, and cloud infrastructure.",
    outcome: "Safeguarded about $4M in on-chain client assets over roughly 3 years with zero security incidents, while cutting infrastructure and gas costs.",
  },
  {
    slug: "quiztion",
    name: "Quiztion",
    logoPath: "images/proof/clients/quiztion.png",
    mission: "Scale the real-time backend for multiplayer mobile trivia while keeping hosting costs under control.",
    outcome: "Raised throughput about 10x, improved crash-free sessions from about 65% to 92%, and reduced recovery time from minutes to seconds.",
  },
  {
    slug: "bugdasht",
    name: "BugDasht",
    logoPath: "images/proof/clients/bugdasht.png",
    mission: "Build a crowdsourced cybersecurity platform from idea to market-ready MVP with secure auditability.",
    outcome: "Delivered the MVP in about 8 months (NO AI back then), added encryption and non-repudiation features, and fixed a critical business logic vulnerability.",
  },
  {
    slug: "mci",
    name: "MCI",
    logoPath: "images/proof/clients/mci.png",
    mission: "Automate repetitive security operations and move vulnerability detection earlier in the SDLC.",
    outcome: "Saved about 3 analyst hours per day, reduced human-error risk, and created practical security tooling and guidelines for engineers.",
  },
  {
    slug: "eligasht",
    name: "Eligasht",
    logoPath: "images/proof/clients/eligasht.png",
    mission: "Develop and maintain backend APIs and integrations for travel booking workflows.",
    outcome: "Supported reliable booking subsystems and third-party integrations inside a high-change e-commerce environment.",
  },
  {
    slug: "saman-bank",
    name: "Saman Bank",
    logoPath: "images/proof/clients/saman_bank.png",
    mission: "Contribute to backend subsystems in a regulated core banking environment.",
    outcome: "Maintained enterprise APIs and multi-layer financial systems using Oracle, IBM DB2, C#, and JavaScript.",
  },
];

export function getClientProofAriaLabel(item: ClientProofItem): string {
  return `${item.name}. Mission: ${item.mission} Outcome: ${item.outcome}`;
}
