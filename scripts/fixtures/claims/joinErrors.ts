// A stand-in for UI-launcher/src/lib/joinErrors.ts with the same export and the
// same shape of answer, so check-claims.test.mjs can exercise the child-process
// path (type stripping, stdin/stdout) without the real repository.
export type JoinFailureKind = "strict-differs" | "launcher-outdated" | "other";

export interface JoinFailure {
  kind: JoinFailureKind;
  headline: string;
  examplePath?: string;
  raw: string;
}

const DIFFERS = /^Game files do not match this server's reference \((\d+) problems?\)\.\s*([\s\S]*)$/;
const PROTOCOL = /^Protocol version mismatch: launcher speaks v(\d+), server speaks v(\d+)/;

export function describeJoinFailure(reason: string, _context: object = {}): JoinFailure {
  const raw = reason.trim();
  let m = DIFFERS.exec(raw);
  if (m) {
    const first = /^(\S+) \(\w+\)/.exec(m[2]);
    return {
      kind: "strict-differs",
      headline: `Your game files do not match this server's reference (${m[1]} problems)`,
      examplePath: first ? first[1].replace(/^userfolder:/, "") : undefined,
      raw,
    };
  }
  m = PROTOCOL.exec(raw);
  if (m && Number(m[1]) < Number(m[2])) {
    return { kind: "launcher-outdated", headline: "This server needs a newer launcher — update from the Download page", raw };
  }
  return { kind: "other", headline: raw, raw };
}
