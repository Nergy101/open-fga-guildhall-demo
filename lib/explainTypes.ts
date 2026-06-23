// Shared, dependency-free types for the explain feature so the client island can
// import them without pulling in any server-only code.

export interface ExplainTuple {
  user: string;
  relation: string;
  object: string;
  condition?: { name: string; context: Record<string, unknown> };
  matchUser: boolean;
  matchObject: boolean;
}

export interface ExplainResult {
  allowed: boolean;
  user: string;
  relation: string;
  object: string;
  type: string;
  typeBlock: string;
  relationLine: string;
  conditions: { name: string; block: string }[];
  context?: Record<string, unknown>;
  tuples: ExplainTuple[];
  expandOutline: string[];
}
