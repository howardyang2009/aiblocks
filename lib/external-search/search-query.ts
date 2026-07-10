import type { ComponentType } from "@/lib/external-search/types";

export const COMPONENT_TYPES: ComponentType[] = [
  "skill",
  "subagent",
  "prompt",
  "mcp",
  "hook",
  "slash-command",
  "claude-plugin",
  "claude-md",
  "llm",
];

export const DEFAULT_COMPONENT_TYPE: ComponentType = "skill";

export function isComponentType(value: string): value is ComponentType {
  return (COMPONENT_TYPES as string[]).includes(value);
}

export function resolveComponentType(raw: string | undefined): ComponentType {
  if (raw && isComponentType(raw)) return raw;
  return DEFAULT_COMPONENT_TYPE;
}

const TYPE_TO_TAG: Record<ComponentType, string> = {
  skill: "skill",
  subagent: "subagent",
  prompt: "prompt",
  mcp: "mcp-server",
  hook: "hook",
  "slash-command": "slash-command",
  "claude-plugin": "claude-plugin",
  "claude-md": "claude-md",
  llm: "llm",
};

export function tagForComponentType(type: ComponentType): string {
  return TYPE_TO_TAG[type];
}
