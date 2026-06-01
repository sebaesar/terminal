import { TerminalLineRow } from "@components/TerminalLine";
import type { Cell, CommandButton } from "@types";

type ExecuteCommand = (
  command: string,
  options?: { typing?: CommandButton["typing"] },
) => void;

export type DisplayProps = {
  body?: Cell[];
  prompt: string;
  executeCommand: ExecuteCommand;
  introStartLineRange?: { start: number; count: number } | null;
  introStartVisible?: boolean;
  hiddenLines?: Set<number>;
  commandLookup?: Map<number, { commandText: string }>;
  latestCommandIndex?: number | null;
  collapsedCommands?: Record<number, boolean>;
  onToggleCommand?: (lineIndex: number) => void;
};

export function Display({
  body = [],
  prompt,
  executeCommand,
  introStartLineRange = null,
  introStartVisible = false,
  hiddenLines = new Set<number>(),
  commandLookup = new Map<number, { commandText: string }>(),
  latestCommandIndex = null,
  collapsedCommands = {},
  onToggleCommand,
}: DisplayProps) {
  return (
    <pre className="t-output" aria-live="polite">
      {body.map((cell, index) => {
        const isIntroLine =
          !!introStartLineRange &&
          index >= introStartLineRange.start &&
          index < introStartLineRange.start + introStartLineRange.count;
        const introOffset =
          isIntroLine && introStartLineRange
            ? index - introStartLineRange.start
            : null;
        const introClassSuffix =
          introOffset === 0
            ? " intro-proofLine"
            : introOffset === 1
            ? " intro-ctaPrimary"
            : introOffset === 2
              ? " intro-ctaNav"
              : "";
        const className = isIntroLine
          ? `intro-start-line${introStartVisible ? " is-visible" : ""}${introClassSuffix}`
          : undefined;

        if (hiddenLines.has(index)) return null;

        const commandMeta = commandLookup.get(index);
        const isCommandLine = Boolean(commandMeta);
        const isCollapsed = isCommandLine && collapsedCommands[index];
        const isHistoricalCommand =
          isCommandLine &&
          latestCommandIndex !== null &&
          index < latestCommandIndex;

        return (
          <span key={`line-${index}`}>
            <TerminalLineRow
              line={cell}
              lineIndex={index}
              className={className}
              executeCommand={executeCommand}
              isCommandLine={isCommandLine}
              isCollapsed={isCollapsed}
              isHistoricalCommand={isHistoricalCommand}
              prompt={prompt}
              commandText={commandMeta?.commandText}
              onToggleCollapse={
                isCommandLine && onToggleCommand
                  ? () => onToggleCommand(index)
                  : undefined
              }
            />
            {index < body.length - 1 ? "\n" : null}
          </span>
        );
      })}
    </pre>
  );
}
