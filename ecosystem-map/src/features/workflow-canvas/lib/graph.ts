/* ---------------------------------------------------------------------------
   Pure graph helpers over the persistent edge list. No React, no store —
   easy to unit test and reuse from the validator and the layout engine.
--------------------------------------------------------------------------- */

export interface DirectedEdge {
  source: string;
  target: string;
}

/** Adjacency map: nodeId -> ids reachable in one hop. */
export function buildAdjacency(edges: readonly DirectedEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    let out = adj.get(e.source);
    if (!out) {
      out = new Set<string>();
      adj.set(e.source, out);
    }
    out.add(e.target);
  }
  return adj;
}

/** True when `to` is reachable from `from` by following edges forward. */
export function isReachable(adj: Map<string, Set<string>>, from: string, to: string): boolean {
  if (from === to) return true;
  const stack: string[] = [from];
  const seen = new Set<string>([from]);
  while (stack.length > 0) {
    const current = stack.pop() as string;
    const next = adj.get(current);
    if (!next) continue;
    for (const n of next) {
      if (n === to) return true;
      if (!seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return false;
}

/**
 * Would adding `source -> target` close a cycle?
 * A cycle appears exactly when `source` is already reachable from `target`.
 */
export function wouldCreateCycle(edges: readonly DirectedEdge[], source: string, target: string): boolean {
  if (source === target) return true;
  return isReachable(buildAdjacency(edges), target, source);
}

/** Kahn topological sort. Returns `null` if the graph is not a DAG. */
export function topologicalOrder(nodeIds: readonly string[], edges: readonly DirectedEdge[]): string[] | null {
  const indegree = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  const adj = buildAdjacency(edges);
  for (const e of edges) indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);

  const queue = nodeIds.filter((id) => (indegree.get(id) ?? 0) === 0);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    order.push(id);
    for (const n of adj.get(id) ?? []) {
      const d = (indegree.get(n) ?? 0) - 1;
      indegree.set(n, d);
      if (d === 0) queue.push(n);
    }
  }
  return order.length === nodeIds.length ? order : null;
}
