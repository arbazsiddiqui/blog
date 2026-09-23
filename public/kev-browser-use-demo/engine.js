// kev-browser-use demo harness: turns what a page shows into the text the model reads.
// No model code here. The state and option text match train/data/to_kev_format.py:
// Goal line, the last two previous actions, then one line per candidate.

export const OPERATIONS = ["CLICK", "TYPE", "SELECT"];
export const ELEMENT_QUESTION = "Which element should be acted on?";
export const OPERATION_QUESTION = "What operation should be performed on the target element?";
export const GROUP_SIZE = 10;

// Training cut: longer than 60 characters becomes the first 57 plus "...".
export function cut(text, n = 60) {
  const s = String(text).trim().replace(/\s+/g, " ");
  return s.length > n ? s.slice(0, n - 3) + "..." : s;
}

export function candidateLine(c, i) {
  return `[${i}] <${c.tag}> role=${c.role} "${cut(c.text)}"`;
}

export function optionLabel(c, i) {
  return `[${i}] <${c.tag}> "${cut(c.text)}"`;
}

export function historyLine(h) {
  return `[${h.role}]  ${cut(h.text)} -> ${h.op}${h.value ? `: ${h.value}` : ""}`;
}

export function buildState(goal, history, cands) {
  const lines = [`Goal: ${goal}`];
  const prev = history.slice(-2);
  if (prev.length) {
    lines.push("Previous actions:");
    for (const h of prev) lines.push(`- ${historyLine(h)}`);
  }
  lines.push("Candidate elements:");
  cands.forEach((c, i) => lines.push(candidateLine(c, i)));
  return lines.join("\n");
}

// More than 10 candidates: groups of at most 10 in page order, as even as possible.
export function splitGroups(list, size = GROUP_SIZE) {
  const n = Math.ceil(list.length / size);
  const per = Math.ceil(list.length / n);
  const groups = [];
  for (let i = 0; i < list.length; i += per) groups.push(list.slice(i, i + per));
  return groups;
}
