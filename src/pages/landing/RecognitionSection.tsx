import { recognitionItems } from "./content";
import type { LandingSectionProps } from "./types";

export function RecognitionSection({ hidden }: LandingSectionProps) {
  return (
    <section
      id="recognition"
      className="landing-slide landing-section landing-recognition"
      aria-labelledby="recognition-title"
      hidden={hidden}
    >
      <div className="landing-sectionInner">
        <p className="landing-kicker">Recognition</p>
        <h2 id="recognition-title">Founders often arrive here after:</h2>
        <ul className="landing-recognitionList">
          {recognitionItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
