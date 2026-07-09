import { describe, expect, it } from "vitest";
import { COMPONENT_TYPES, DEFAULT_COMPONENT_TYPE, resolveComponentType, tagForComponentType } from "./search-query";

describe("resolveComponentType", () => {
  it("returns the default type when raw is undefined", () => {
    expect(resolveComponentType(undefined)).toBe("skill");
  });

  it("returns the default type when raw is not a known type", () => {
    expect(resolveComponentType("not-a-type")).toBe(DEFAULT_COMPONENT_TYPE);
  });

  it("returns the matching type when raw is a known type", () => {
    expect(resolveComponentType("mcp")).toBe("mcp");
    expect(resolveComponentType("claude-md")).toBe("claude-md");
  });
});

describe("tagForComponentType", () => {
  it("maps every component type to its aiblocks catalog tag", () => {
    const expected: Record<string, string> = {
      skill: "skill",
      subagent: "subagent",
      prompt: "prompt",
      mcp: "mcp-server",
      hook: "hook",
      "slash-command": "slash-command",
      "claude-plugin": "claude-plugin",
      "claude-md": "claude-md",
      model: "model",
    };
    for (const type of COMPONENT_TYPES) {
      expect(tagForComponentType(type)).toBe(expected[type]);
    }
  });
});
