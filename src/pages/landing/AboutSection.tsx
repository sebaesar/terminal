import { useState } from "react";
import { ownershipPrinciples } from "./content";
import {
  getExpandedPrincipleIndex,
  selectPrinciple,
} from "./principleExpansion";
import type { LandingSectionProps } from "./types";

export function AboutSection({ hidden }: LandingSectionProps) {
  const [selectedPrincipleIndex, setSelectedPrincipleIndex] = useState<
    number | null
  >(null);
  const expandedPrincipleIndex = getExpandedPrincipleIndex({
    selectedIndex: selectedPrincipleIndex,
  });

  return (
    <section
      id="about"
      className="landing-slide landing-section landing-about"
      aria-labelledby="about-title"
      hidden={hidden}
    >
      <div className="landing-sectionInner landing-aboutGrid">
        <div>
          <p className="landing-kicker">Working method</p>
          <h2 id="about-title">
            I work where delivery risk needs a clear method.
          </h2>
        </div>
        <div
          className="landing-principles"
          aria-label="How execution is owned"
        >
          {ownershipPrinciples.map((item, index) => {
            const isExpanded = expandedPrincipleIndex === index;
            const bodyId = `landing-principle-${index}-body`;

            return (
              <section
                key={item.title}
                className="landing-principle"
                data-expanded={isExpanded ? "true" : "false"}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") {
                    setSelectedPrincipleIndex(selectPrinciple(index));
                  }
                }}
              >
                <h3>
                  <button
                    type="button"
                    className="landing-principleButton"
                    aria-expanded={isExpanded}
                    aria-controls={bodyId}
                    onClick={() => {
                      setSelectedPrincipleIndex(selectPrinciple(index));
                    }}
                    onFocus={() => {
                      setSelectedPrincipleIndex(selectPrinciple(index));
                    }}
                  >
                    <span>{item.title}</span>
                  </button>
                </h3>
                <div
                  id={bodyId}
                  className="landing-principlePanel"
                  aria-hidden={!isExpanded}
                >
                  <div className="landing-principlePanelInner">
                    <p>{item.body}</p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
