import { describe, expect, it } from "vitest";
import {
  CLIENT_PROOF_ITEMS,
  CLIENT_PROOF_TITLE,
  getClientProofAriaLabel,
} from "../clientProof";

describe("client proof intro data", () => {
  it("references every client logo from the proof clients directory", () => {
    expect(CLIENT_PROOF_ITEMS).toHaveLength(8);
    expect(CLIENT_PROOF_TITLE).not.toContain("Start here");
    expect(
      CLIENT_PROOF_ITEMS.every((item) =>
        item.logoPath.startsWith("images/proof/clients/"),
      ),
    ).toBe(true);
  });

  it("keeps mission and outcome text available for tooltips and dialogs", () => {
    CLIENT_PROOF_ITEMS.forEach((item) => {
      expect(item.mission.length).toBeGreaterThan(12);
      expect(item.outcome.length).toBeGreaterThan(12);
      expect(getClientProofAriaLabel(item)).toContain("Mission:");
      expect(getClientProofAriaLabel(item)).toContain("Outcome:");
    });
  });
});
