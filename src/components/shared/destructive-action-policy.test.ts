import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function applicationFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return applicationFiles(fullPath);
    return entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx")
      ? [fullPath]
      : [];
  });
}

function buttonOpeningTags(source: string) {
  const tags: string[] = [];
  let start = source.indexOf("<Button");

  while (start !== -1) {
    let braceDepth = 0;
    let quote: '"' | "'" | "`" | null = null;

    for (let index = start + "<Button".length; index < source.length; index++) {
      const character = source[index];

      if (quote) {
        if (character === quote && source[index - 1] !== "\\") quote = null;
        continue;
      }

      if (character === '"' || character === "'" || character === "`") {
        quote = character;
      } else if (character === "{") {
        braceDepth += 1;
      } else if (character === "}") {
        braceDepth -= 1;
      } else if (character === ">" && braceDepth === 0) {
        tags.push(source.slice(start, index + 1));
        break;
      }
    }

    start = source.indexOf("<Button", start + "<Button".length);
  }

  return tags;
}

function policyViolations(source: string) {
  const tags = buttonOpeningTags(source);
  const isOutlineVariant = (tag: string) =>
    /variant\s*=\s*(?:"outline"|\{\s*"outline"\s*\}|\{\s*'outline'\s*\})/.test(
      tag,
    );
  const isDestructiveVariant = (tag: string) =>
    /variant\s*=\s*(?:"destructive"|\{\s*"destructive"\s*\}|\{\s*'destructive'\s*\})/.test(
      tag,
    );
  const hasOutlineDestructiveUtilities = tags.some(
    (tag) =>
      isOutlineVariant(tag) &&
      /(?:border-destructive|text-destructive|bg-destructive)/.test(tag),
  );
  const hasDirectDestructiveVariant = tags.some(isDestructiveVariant);

  return {
    hasDirectDestructiveVariant,
    hasOutlineDestructiveUtilities,
  };
}

describe("destructive action button policy", () => {
  const sourceDirectory = path.join(process.cwd(), "src");
  const policyExemptions = new Set([
    "components/shared/confirmation-sheet.tsx",
    "components/shared/expandable-action-item.tsx",
    "components/shared/item-action-buttons.tsx",
    "components/ui/button.tsx",
  ]);

  it("exposes a semantic shared destructive action component", () => {
    const sharedComponent = fs.readFileSync(
      path.join(process.cwd(), "src/components/shared/item-action-buttons.tsx"),
      "utf8",
    );

    expect(sharedComponent).toContain(
      "export function DestructiveActionButton",
    );
    expect(sharedComponent).toContain('variant="destructive-subtle"');
  });

  it("detects literal and expression-wrapped destructive Button variants", () => {
    expect(
      policyViolations(
        '<Button variant={"outline"} className="border-destructive" />',
      ).hasOutlineDestructiveUtilities,
    ).toBe(true);
    expect(
      policyViolations("<Button variant={'destructive'} />")
        .hasDirectDestructiveVariant,
    ).toBe(true);
  });

  it("does not hand-compose destructive Button styles in application UI", () => {
    const violations = applicationFiles(sourceDirectory)
      .map((file) => ({
        file: path.relative(sourceDirectory, file),
        ...policyViolations(fs.readFileSync(file, "utf8")),
      }))
      .filter(({ file }) => !policyExemptions.has(file))
      .filter(
        ({ hasDirectDestructiveVariant, hasOutlineDestructiveUtilities }) =>
          hasDirectDestructiveVariant || hasOutlineDestructiveUtilities,
      );

    expect(violations).toEqual([]);
  });
});
