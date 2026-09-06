import { useCallback, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import { CardNode } from "./components/nodes/CardNode";
import { ZoneNode } from "./components/nodes/ZoneNode";
import { HeaderBar } from "./components/HeaderBar";
import { DetailPanel } from "./components/DetailPanel";
import { EDGE_CATEGORY, initialEdges, initialNodes, type CardData, type Category } from "./data/graph";

const nodeTypes = { card: CardNode, zone: ZoneNode };

export default function App() {
  const [dark, setDark] = useState(true);
  const [focus, setFocus] = useState<Category | null>(null);
  const [selected, setSelected] = useState<CardData | null>(null);

  const toggleTheme = useCallback(() => {
    setDark((d) => {
      document.documentElement.classList.toggle("dark", !d);
      return !d;
    });
  }, []);

  const nodes = useMemo(
    () =>
      initialNodes.map((n) => ({
        ...n,
        data: { ...n.data, dimmed: focus !== null && n.data.category !== focus },
      })),
    [focus],
  );

  const edges = useMemo(
    () =>
      initialEdges.map((e) => {
        const cat = EDGE_CATEGORY[(e.className ?? "").trim()];
        const dim = focus !== null && cat !== focus;
        return { ...e, className: `${e.className} ${dim ? "dimmed" : ""}` };
      }),
    [focus],
  );

  const onNodeClick: NodeMouseHandler = useCallback((_, node: Node) => {
    if (node.type === "card") setSelected(node.data as CardData);
  }, []);

  return (
    <div className="atmosphere relative h-full">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelected(null)}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.28}
          maxZoom={1.8}
          panOnScroll
          zoomOnPinch
          nodesConnectable={false}
          elevateNodesOnSelect
          defaultEdgeOptions={{ type: "default" }}
          proOptions={{ hideAttribution: false }}
        >
          <Background variant={BackgroundVariant.Dots} gap={26} size={1.4} color="var(--line-strong)" />
          <Controls position="bottom-left" showInteractive={false} />
          <MiniMap position="bottom-right" pannable zoomable nodeStrokeWidth={0} />
          <HeaderBar dark={dark} onToggleTheme={toggleTheme} focus={focus} onFocus={setFocus} />
        </ReactFlow>
        <DetailPanel data={selected} onClose={() => setSelected(null)} />
      </ReactFlowProvider>
    </div>
  );
}
