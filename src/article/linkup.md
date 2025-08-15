# Lower bounds for detecting small subgraphs

The exponential-time hypothesis (ETH) implies a lower bound for the canonical hard problem in parameterized complexity: Detecting **$k$-cliques in $n$-vertex graphs.** This problem requires time $n^{\Omega(k)}$ under ETH.

We would like to transfer this lower bound to other parameterized problems. However, there is a problematic blowup: Reductions from $k$-clique to other problems usually need $k$ "vertex gadgets" to encode potential clique vertices, and $k \choose 2$ "edge gadgets" to check edges between the encoded vertices. This yields target instances with parameter value $\ell = \Omega(k^2)$, since each gadget has to increase the parameter by at least a constant value. Due to this parameter increase, only $n^{o(\sqrt \ell)}$ time algorithms can be ruled out for the target problem by reduction from $k$-clique.

A better source problem is **colorful subgraph isomorphism**: We call a  $k$-vertex graph $H$  colorful if it is bijectively vertex-colored with $[k]$. For any fixed colorful $k$-vertex graph $H$, we consider the following problem:

> $\mathsf{ColSub}(H)$: Given colored graphs $H$ and $G$, does $G$ contain a subgraph isomorphic to $H$? The colors matter for the isomorphism, and we assume that $H$ is colorful.

When $H=K_k$ is a complete graph, $\mathsf{ColSub}(K_k)$ is a colorful version of the $k$-clique problem, for which ETH rules out $n^{o(k)}$ time algorithms. A breakthrough result by Marx shows a similar lower bound even for graphs $H$ of maximum degree $3$:
> If ETH holds, then $\mathsf{ColSub}(H)$ cannot be solved in time $n^{o(k/\log k)}$, even for $k$-vertex graphs $H$ of maximum degree $3$.

This helps a lot in proving lower bounds for other parameterized problems. The reason is that many reductions from $\mathsf{Clique}$ to problems $\mathsf X$ can be turned into reductions from $\mathsf{ColSub}(H)$ with arbitrary $H$ to $\mathsf X$. Usually, the same vertex- and edge-gadgets work, each of which increase the parameter by $O(1)$. If we start with a $k$-vertex graph $H$ of maximum degree $3$, then we only need to take care of $O(k)$ rather than $O(k^2)$ edges.

Overall, this transforms an $\mathsf{ColSub}(H)$-instance with a $k$-vertex graph $H$ to an $\mathsf X$-instance with parameter $\ell = O(k)$. If we could then solve $\mathsf X$ in $n^{o(\ell / \log \ell)}$ time, we would refute Marx's bound. This strategy was used in many papers to rule out $n^{o(\ell / \log \ell)}$ time algorithms for problems with known $n^{O(\ell)}$ time algorithms.

In this note, we give a self-contained and arguably simple proof of Marx's lower bound.

## Proving the lower bounds

Our starting point for the proof is the $3$-coloring problem, which has no $2^{o(n)}$ time algorithms under ETH. (This can be shown using the standard reduction from 3-SAT together with the sparsification lemma, by which ETH already rules out $2^{o(n)}$ time algorithms for $n$-variable 3-SAT *with just $O(n)$ clauses*.) The lower bound even holds on graphs of maximum degree $3$.

For technical reasons, we generalize this problem slightly: Besides the usual *"disequality"* edges in the $3$-coloring problem that require distinct colors at their endpoints, we also allow *"equality"* edges that require their endpoints to have the same color. Being a generalization of $3$-coloring, there are no $2^{o(n)}$ time algorithms for this problem under ETH.

Now this is the basic idea behind the lower bound: 
- We transform an $n$-vertex instance $G$ for the generalized $3$-coloring problem into an equivalent $H$-subgraph problem instance $G'$ with approximately $3^{n/k}$ vertices. 
- Then an $n^{o(k)}$-time algorithm for the $H$-subgraph problem would then imply a $2^{o(n)}$-time algorithm for the generalized $3$-coloring problem. But this contradicts ETH. 


### Cliques

As a warm-up, we demonstrate this idea with $H=K_k$. In this case, we construct $G'$ as follows from $G$: 
- $V(G)$ is divided equitably into *blocks* $V_1, \ldots, V_k$ of size at most $\lceil n/k\rceil$ each. The resulting graph depends on our choice of blocks, but any choice is fine.
- For each proper $3$-assignment of $V_i$, we add a vertex of color $i$ to the graph $G'$.
- Two vertices in $G'$ are connected by an edge if their colorings are compatible, meaning they come from different blocks and together form a proper assignment.

%%Applet:reduction%%

In other words, we have created a **compatibility graph** $G'$ on the partial assignments to individual blocks of $G$. This graph has at most  $k 3^b$ vertices, where $b = \lceil n/k \rceil$ is the maximum block size. The key observation is:

> The colorful $k$-cliques $K$ in the compatibility graph $G'$ correspond bijectively to proper assignments of the original graph $G$. 

Indeed, consider a clique $K$ in the compatibility graph $G'$: Its vertices $v_1,\ldots,v_k$ provide a valid assignment for each block in $G$. Moreover, the presence of all edges $v_iv_j$ with $i \neq j$ in $K$ ensures that the union of these partial assignments is a valid assignment of $G$ as a whole. If there was a conflict in the union, then it would stem from an edge between two different blocks in $G$, but our compatibility relation in $G'$ rules this out. Conversely, every proper assignment to $G$ specifies a unique clique in $G'$.

### Blowups and compression rate

Under very lucky conditions, the lower bound for $k$-cliques works even for $H$-subgraph problems involving subgraphs $H$ of $k$-cliques: Imagine that our partition of $V(G)$ into blocks $V_1,\ldots,V_k$ of size $n/k$ gives rise to an "empty pair" $(i,j) \in [k]^2$ such that $G$ does not contain any edges between $V_i$ and $V_j$. In this case, no conflicts can arise between partial assignments to $V_i$ and $V_j$, so we don't need to test compatibility between such assignments. (Restricted to such assignments, the compatibility graph $G'$ is a complete bipartite graph, so it contains no relevant information in this part.)

In fact, $G$ could even have empty pairs for all non-edges of a specific $k$-vertex graph $H$ of interest. Then $G$ would fit into the $t$-**blowup** of $H$, written $H \boxtimes K_t$, which is obtained by turning each vertex $v$ into a $t$-clique and turning edges into complete bipartite graphs. If $G$ is a subgraph of $H \boxtimes K_t$  and we build the compatibility graph $G'$ with blocks corresponding to the cliques, then we obtain:

> If $G$ is a subgraph of $H \boxtimes K_t$, then the proper assignments of $G$ correspond bijectively to the $H$-copies in $G'$. 

Imagine for now that the assignment problem keeps its $2^{\Omega(n)}$ time lower bound under ETH when each input $G$ (an $n$-vertex graph) is given as a subgraph of $H \boxtimes K_{n/k}$. Then the above correspondence between assignments of $G$ and $H$-copies in $G'$ would imply an $n^{\Omega(k)}$ lower bound for the colorful $H$-subgraph problem: Indeed, an $H$-subgraph exists in $G'$ if and only if there is a proper assignment in $G$.

This works more generally: When the coloring problem has a $2^{\Omega(n)}$ lower bound on graphs $G$ that are explicitly given as subgraphs of $H \boxtimes K_{n/t}$, for some **compression rate** $t\in \mathbb N$, then an $n^{\Omega(t)}$ lower bound follows for the colorful $H$-subgraph problem. Our original paper formally defines a closely related but more complicated notion, the *linkage capacity* $\gamma(H)$, but the more informal notion of compression rate above suffices for this note.


## Benes networks

%%Applet:benes%%

In the remainder of the note, we construct $k$-vertex graphs $H$ of maximum degree $4$ with compression rate $t = \Omega(k / \log k)$. These graphs are so-called **Benes networks**, first discovered in the context of communication networks. With the reduction from the previous section, this implies:

> The colorful $H$-subgraph problem for Benes networks requires $n^{\Omega (k/\log k)}$ time under ETH.

This gives us Marx's original lower bound for sparse $H$-subgraph problems, which is the best known lower bound under ETH.

### Construction

The Benes networks are recursively defined graphs $B_\ell$ for $\ell \in \mathbb N$. The graph $B_\ell$ has $2^\ell$ input and $2^\ell$ output vertices, maximum degree $4$, and $O(2^\ell \ell)$ vertices in total. Or, writing $s=2^\ell$, it has $k=O(s \log s)$ vertices. The graphs are built as follows: 
- $B_1$ is a complete bipartite graph on $2+2$ vertices.
- $B_{\ell+1}$ is built from two vertex-disjoint copies of $B_\ell$: For each index $i \in [2^\ell]$, we create two fresh input vertices and make them adjacent to input $i$ from each of the two $B_\ell$-copies. We do the same with outputs. The inputs and outputs of $B_{\ell+1}$ are the new vertices created this way.

Note that the inputs come in pairs of vertices with the same neighborhood; such pairs are called twins. Of course, the same holds for the outputs.

If you want, you can try building your own Benes network below.

%%Applet:construction%%

### Routing matchings in blowups

For our compression result, we consider blowups $B_\ell \boxtimes K_t$ of Benes networks. The inputs/output vertices of $B_\ell \boxtimes K_t$ are the blowups of input/output vertices in $B_\ell$. We show the following:

> **$B_\ell \boxtimes K_t$ can route input-output matchings:** For every bijection $\pi$ from inputs to outputs of $B_\ell \boxtimes K_t$, there is a collection of vertex-disjoint paths connecting each input with its corresponding output under $\pi$.

We prove this by fixing $t$ arbitrary and performing induction over $\ell$. The statement is trivial for $B_1 \boxtimes K_t$, because this graph is isomorphic to $K_{2t,2t}$. 

For the induction step, we assume that $B_\ell \boxtimes K_t$ can route input-output matchings and show it for $B_{\ell+1} \boxtimes K_t$. Recall that $B_{\ell+1}$ consists of two subnetworks $B^\uparrow$ and $B^\downarrow$ isomorphic to $B_\ell$. Then $B_\ell \boxtimes K_t$ consists of subnetwork blowups $B^\uparrow \boxtimes K_t$ and $B^\downarrow \boxtimes K_t$.

A collection of paths $\mathcal P$ from inputs to outputs in $B_{\ell+1} \boxtimes K_t$ is vertex-disjoint if (but not only if) the following three conditions are satisfied:
1. For $i \in [2^\ell]$, write $v_i$ and $v'_i$ for the two inputs of $B_{\ell+1}$ adjacent to input $i$ of the two subnetworks. Let $a$ and $a'$ be vertices in $B_{\ell+1} \boxtimes K_t$ from the $t$-blowups of $v_i$ and $v'_i$, respectively. The **first condition** is that the two paths starting at $a$ and $a'$ should go into different subnetwork blowups.
2. The same holds for outputs: If $w_i$ and $w_{2^\ell +i}$ are the outputs adjacent to output $i$ of the subnetworks, then the paths in $\mathcal P$ ending there must come from different subnetworks.
3. Within each subnetwork, $\mathcal P$ must induce vertex-disjoint paths from inputs to outputs.



### Compression rate

To show the compression rate, we prove that every $n$-vertex graph $G$ of maximum degree $4$ is a topological minor of $H \boxtimes K_{n/t}$. This means $G$ is a subgraph of $H \boxtimes K_{n/t}$ after subdividing the edges of $H$ appropriately.


