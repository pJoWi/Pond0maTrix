import { topologicalOrder } from "./graph";
import { useWorkflowStore } from "../store/useWorkflowStore";

/* ---------------------------------------------------------------------------
   Visual dry-run: walks the DAG in topological order, flipping each node
   to `running` (which lights up its outgoing gradient edges) and then to
   `success`. Status changes are runtime, not authoring, so the temporal
   store is paused for the duration — a simulation never lands in undo.
--------------------------------------------------------------------------- */

const STEP_MS = 700;
const SETTLE_MS = 1400;

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export async function simulateRun(): Promise<void> {
  const store = useWorkflowStore;
  const temporal = store.temporal.getState();
  const { nodes, edges, setNodeStatus } = store.getState();
  const order = topologicalOrder(
    nodes.map((n) => n.id),
    edges,
  );
  if (!order) return; // validator guarantees a DAG, but never trust a cached graph blindly

  temporal.pause();
  try {
    for (const id of order) {
      setNodeStatus(id, "running");
      await sleep(STEP_MS);
      setNodeStatus(id, "success");
    }
    await sleep(SETTLE_MS);
    for (const id of order) setNodeStatus(id, "idle");
  } finally {
    temporal.resume();
  }
}
