/*function useGraphEditing() {
  let [draggedNode, setDraggedNode] = useState<GraphNode>();
  let [edgeInteraction, setEdgeInteraction] = useState<AddEdgeInteraction>();
  let [mousePos, setMousePos] = useState<Vec2>();

  // NOTE: Calling e.preventDefault is necessary in the mouse handlers, to avoid
  // Firefox from removing the keyboard focus from the parent interceptor.

  function handleMouseDown(e: React.MouseEvent, node?: GraphNode, edge?: GraphEdge) {
    let [ex, ey] = cnv.getEventPoint(e);

    if (tool === 'insert') {
      if (node) {
        // Add an edge
        setEdgeInteraction({
          fromNode: node
        });
        e.stopPropagation();
        e.preventDefault();
      } else {
        // Add a node.
        let x = cnv.grid.xFromScreen(ex, ey, false);
        let y = cnv.grid.yFromScreen(ex, ey, false);
        let newNode: GraphNode = { color: TriadColor.Col1, key: "usrnd_" + graph.getNextId(), fy: y, fx: x };

        graph.nodes.push(newNode);
        onChange(graph);
        e.stopPropagation();
        e.preventDefault();
      }
    } else if (tool === 'delete') {
      if (node) {
        graph.deleteNode(node);
        onChange(graph);
        e.stopPropagation();
        e.preventDefault();
      } else if (edge) {
        graph.deleteEdge(edge);
        onChange(graph);
        e.stopPropagation();
        e.preventDefault();
      }
    } else if (tool === 'drag') {
      if (node) {
        setDraggedNode(node);
        e.stopPropagation();
        e.preventDefault();
      }
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    let [ex, ey] = cnv.getEventPoint(e);

    console.log(draggedNode);
    if (draggedNode) {
      let x = cnv.grid.xFromScreen(ex, ey, false);
      let y = cnv.grid.yFromScreen(ex, ey, false);

      draggedNode.fx = x;
      draggedNode.fy = y;
      onChange(graph);
    } else if (edgeInteraction) {
      setEdgeInteraction({
        fromNode: edgeInteraction.fromNode
      });
      e.stopPropagation();
      e.preventDefault();
    }

    setMousePos([ex, ey]);
  }

  function handleMouseUp(e: React.MouseEvent, node?: GraphNode) {
    let [ex, ey] = cnv.getEventPoint(e);

    if (draggedNode) {
      let x = cnv.grid.xFromScreen(ex, ey, false);
      let y = cnv.grid.yFromScreen(ex, ey, false);

      draggedNode.fx = x;
      draggedNode.fy = y;

      onChange(graph);
      setDraggedNode(undefined);
      e.stopPropagation();
      e.preventDefault();
    }

    if (edgeInteraction) {
      if (node) {
        let newEdge: GraphEdge = {
          source: edgeInteraction.fromNode,
          target: node,
          type: EdgeType.Disequality
        };
        graph.edges.push(newEdge);
      }

      onChange(graph);
      setEdgeInteraction(undefined);
      e.stopPropagation();
      e.preventDefault();
    }
  }
}*/