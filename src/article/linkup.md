# Lower bounds for detecting small subgraphs

The [exponential-time hypothesis (ETH)](https://en.wikipedia.org/wiki/Exponential_time_hypothesis) implies a lower bound for the canonical hard problem in parameterized complexity: Detecting **$k$-cliques in $n$-vertex graphs.** Namely, under ETH, this problem requires time $n^{\Omega(k)}$.

We would like to transfer this lower bound to other parameterized problems. This however seems impossible at first glance: Reductions from $k$-clique to other problems tend to need $k$ "vertex gadgets" that encode potential clique vertices, and $k \choose 2$ "edge gadgets" that check edges between the encoded vertices. This yields target instances with parameter value $\ell = \Omega(k^2)$, since each gadget has to increase the parameter by at least a constant value. Due to this parameter increase, a reduction from $k$-clique only rules out $n^{o(\sqrt \ell)}$ time algorithms for the target problem.

A better source problem is **colorful subgraph isomorphism**: We call a $k$-vertex graph $H$ colorful if it is bijectively colored with $k$ colors. For any fixed colorful $k$-vertex graph $H$, we consider the following problem:

> %%Frame%%Problem%%prob-colsub%%$\mathsf{ColSub}(H)$%% Given colored graphs $H$ and $G$, where $H$ is colorful, does $G$ contain a subgraph isomorphic to $H$? The colors matter for the isomorphism.

When $H=K_k$ is a complete graph, $\mathsf{ColSub}(K_k)$ is a colorful version of the $k$-clique problem, for which ETH rules out $n^{o(k)}$ time algorithms. A breakthrough result by Marx shows a similar lower bound even for graphs $H$ of maximum degree $3$:
> If ETH holds, then $\mathsf{ColSub}(H)$ cannot be solved in time $n^{o(k/\log k)}$, even for certain $k$-vertex graphs $H$ of maximum degree $3$.

This gives us lower bounds for other parameterized problems. The reason is that many reductions from $\mathsf{Clique}$ to problems $\mathsf X$ can be generalized, without too much effort, into more general reductions from $\mathsf{ColSub}(H)$ with arbitrary $H$ to $\mathsf X$. Usually, the same vertex- and edge-gadgets work, each of which increase the parameter by $O(1)$. Crucially, if we start with a $k$-vertex graph $H$ of maximum degree $3$, then we only need to take care of $O(k)$ rather than $O(k^2)$ edges. 

Overall, this transforms an $\mathsf{ColSub}(H)$-instance with a $k$-vertex graph $H$ to an $\mathsf X$-instance with parameter $\ell = O(k)$. If we could then solve $\mathsf X$ in $n^{o(\ell / \log \ell)}$ time, we would refute Marx's bound. This strategy was used in many papers to rule out $n^{o(\ell / \log \ell)}$ time algorithms for problems with known $n^{O(\ell)}$ time algorithms.

In this note, we give a self-contained and arguably simple proof of Marx's lower bound.

## Proof idea

Our proof starts from the $3$-coloring problem, which has no $2^{o(n)}$ time algorithms under ETH, even on graphs of maximum degree $4$. This can be shown with the standard reduction from $3$-SAT to $3$-coloring, combined with the sparsification lemma. (This lemma says that ETH already rules out $2^{o(n)}$ time algorithms for *sparse* $n$-variable $3$-SAT, i.e., with just $O(n)$ clauses.) For technical reasons, we generalize this problem slightly. 
- In the standard problem, we are given a graph $G=(V,E)$ and should decide whether there is an assignment $a : V \to \{1,2,3\}$ such that each edge has *distinct* colors on its endpoints, that is, we want $a(u) \neq a(v)$ for all $uv \in E$. 
- In our version, we also want to enforce some edges to have endpoints of the *same* color. That is, we require $a(u) = a(v)$ for those *"equality"* edges $uv \in E$. We call the other edges *"disequality"* edges.

Testing for an assignment $a : V \to \{1,2,3\}$ that satisfies all conditions imposed by edges is only more general than $3$-coloring, so ETH rules out $2^{o(n)}$ time algorithms on graphs of maximum degree $4$.  The basic idea for the reduction from the generalized assignment is now this: 
- We transform an $n$-vertex instance $G$ for the $3$-coloring problem into an equivalent blown up $H$-subgraph problem instance $G'$ with approximately $3^{n/k}$ vertices. 
- An $n^{o(k)}$-time algorithm for $H$-subgraphs would then imply $2^{o(n)}$ time for $3$-coloring. But this contradicts ETH.


### From $3$-coloring to cliques

To warm up, let us demonstrate this idea in the special case that $H=K_k$ is a clique. We construct $G'$ as follows from $G$: 
- $V(G)$ is divided arbitrarily into *blocks* $V_1, \ldots, V_k$, each of size at most $t := \lceil n/k\rceil$.
- For each valid $3$-assignment of $V_i$, add a vertex of color $i$ to the graph $G'$.
- Two vertices in $G'$ are connected by an edge if their colorings are compatible, meaning they come from different blocks and together form a proper assignment.

%%Applet%%reduction%%

We call $G'$ the **compatibility graph**, as it tells us which partial assignments to individual blocks of $G$ are compatible. This graph has at most  $k 3^t$ vertices, where $t = \lceil n/k \rceil$ is the maximum block size. The key observation:

> The colorful $k$-cliques $K$ in the compatibility graph $G'$ correspond bijectively to proper assignments of the original graph $G$. 

Indeed, consider a clique $K$ in the compatibility graph $G'$: Its vertices $v_1,\ldots,v_k$ provide a proper assignment for each block in $G$. Moreover, the presence of all edges $v_iv_j$ with $i \neq j$ in $K$ ensures that the union of these partial assignments is a valid assignment of $G$ as a whole. If there was a conflict in the union, then it would stem from an edge between two different blocks in $G$, but our compatibility relation in $G'$ rules this out. Conversely, every proper assignment to $G$ specifies a unique clique in $G'$.

### Blowups

Under very lucky conditions, the proof above works even for $H$-subgraph problems when $H$ is much sparser than a clique: Imagine that our partition of $V(G)$ into blocks $V_1,\ldots,V_k$ is such that no edges run between two particular blocks $V_i$ and $V_j$. Let us then call $(i,j)$ an empty pair. For such empty pairs, no conflicts can arise between partial assignments to $V_i$ and $V_j$, so we can skip the compatibility test between such assignments.

In fact, the partition of $G$ could be so nice that all non-edges $ij \notin E(H)$ of a specific $k$-vertex graph $H$ of interest give rise to empty pairs. If $t = \lceil n/k \rceil$ denotes the maximum block size, then $G$ would fit into the $t$-**blowup** of $H$, written $H \boxtimes K_t$. This is the graph obtained by turning each vertex $v$ into a $t$-clique and turning edges into complete bipartite graphs between the cliques. In this very nice situation, we have:

> If $G$ is a subgraph of $H \boxtimes K_t$, then the proper assignments of $G$ correspond bijectively to the $H$-copies in $G'$. 

Imagine now that, for some reason, the $3$-assignment problem stayed hard under ETH (with an $2^{\Omega(n)}$ time lower bound) when the $n$-vertex input graph $G$ is given as a subgraph of $H \boxtimes K_{n/k}$. Then the above correspondence between assignments of $G$ and $H$-copies in $G'$ directly gives an $n^{\Omega(k)}$ lower bound for the colorful $H$-subgraph problem, because testing for an $H$-subgraph in $G'$ is equivalent to testing for a proper assignment in $G$.

### Compression rate

Just before, we have learned the following: When the $3$-assignment problem has an $2^{\Omega(n)}$ time lower bound on graphs $G$ that fit into the $\lceil n/k \rceil$-blowup of $H$, then testing for $H$-copies in $n$-vertex graphs has an $n^{\Omega(k)}$ lower bound.
It may however happen that $G$ does not fit into the $\lceil n/k \rceil$-blowup of $H$, but only into an $n/R$-blowup of $H$ for some $R \leq k$. It certainly fits when $R=1$, as the $n$-blowup of $H$ contains an $n$-clique. 

Let us say (for now only informally) that $H$ admits *compression rate* $R \in \mathbb N$ if the generalized $3$-coloring problem has an $2^{\Omega(n)}$ time lower bound on graphs $G$ that fit into the $\lceil n/R \rceil$-blowup of $H$. An $n^{\Omega(R)}$ lower bound then follows for the colorful $H$-subgraph problem by our argument above. Ideally we have $R \in \Omega(k)$, which holds for cliques, but we'll make the sacrifice of lowering the compression rate to $R \in \Omega(k/ \log k)$ in order to pass to sparse graphs $H$. 

In our proofs, we use a more formal and inherently graph-theoretic definition. At the end of this note, we'll show that the lower bounds under ETH indeed follow with this definition. In the following, we say that a graph $X$ contains $G$ as a *topological minor* if we can subdivide the edges of $G$ and find the result as a subgraph in $X$. This subgraph called a *topological minor model* of $G$ in $X$.

> %%Frame%%Definition%%def-comprate%%Compression rate%%
> The compression rate $R(H)$ of $H$ is the maximum $R \in \mathbb N$ such that the following holds: For every bipartite graph $G$ with $n+n$ vertices and maximum degree $5$, the blowup $H \boxtimes K_{\lceil n/R \rceil}$ contains $G$ as a *topological minor*. Moreover, a topological minor model of $G$ can be found in polynomial time.

Our [original paper](https://arxiv.org/abs/2410.02606) uses a closely related but somewhat more complicated notion, the *linkage capacity* $\gamma(H)$. For this note, the simpler notion above suffices.
You might also wonder why the definition only requires bipartite graphs:

> The generalized $3$-coloring problem admits no $2^{o(n)}$ time algorithms on bipartite graphs of maximum degree $5$.

Starting from the $3$-coloring problem on a graph $G=(V,E)$ of maximum degree $4$, replace each vertex $v$ by vertices $\ell_v$ and $r_v$, connected by an equality edge, and replace each edge $uv\in E$ by a disequality edge $\ell_u r_v$. Contracting the equality edges gives back $G$ on disequality edges.

## Beneš networks

%%Applet%%benes%%

In the remainder of this note, we construct $k$-vertex graphs of maximum degree $4$ with compression rate $R = \Omega(k / \log k)$. These graphs are so-called **Beneš networks** and were originally developed for communication networks. With the reduction from the previous section, this implies:

> The colorful $H$-subgraph problem for Beneš networks requires $n^{\Omega (k/\log k)}$ time under ETH.

This gives us Marx's original lower bound for sparse $H$-subgraph problems, which is the best known lower bound under ETH for $k$-vertex pattern graphs with $O(k)$ edges. 

### Construction

The Beneš networks are recursively defined graphs $B_\ell$ for $\ell \in \mathbb N$. The graph $B_\ell$ has $2^\ell$ input and $2^\ell$ output vertices, maximum degree $4$, and $O(2^\ell \ell)$ vertices in total. Writing $s=2^\ell$, it has $k=O(s \log s)$ vertices. The graphs are built as follows: 
- $B_1$ is a complete bipartite graph on $2+2$ vertices.
- $B_{\ell+1}$ is built from two vertex-disjoint copies $B^\uparrow$ and $B^\downarrow$ of $B_\ell$: For each index $i \in [2^\ell]$, we create two fresh input vertices and make them adjacent to input $i$ from each of the two $B_\ell$-copies. We do the same with outputs. The inputs and outputs of $B_{\ell+1}$ are the new vertices created this way.

Note that the inputs come in pairs of vertices with the same neighborhood; such pairs are called *twins*. Same for the outputs. You can try building your own Beneš network below.

%%Applet%%construction%%

### Routing matchings

To establish the claimed compression rate, we need to consider blowups $B_\ell \boxtimes K_t$ of Beneš networks. This just means that every vertex in the network is replaced by a clique $K_t$, and the inputs and outputs of $B_\ell \boxtimes K_t$ are the blowups of the inputs and outputs in $B_\ell$. Note that the recursive construction above gives us $B_\ell \boxtimes K_t$ if we replace the starting graph $K_{2,2}$ by $K_{2,2} \boxtimes K_t$. In other words, we can either blow up the initial graph and then perform the recursive construction of Beneš networks, or we do the recursive construction and the blow up. Both give the same result.

We first show that these blowups can realize arbitrary pairings between inputs and outputs by vertex-disjoint paths; we say that they can *route matchings*. This will be crucial when proving the compression rate later. The proof is shown in introductory courses on discrete mathematics; we have also prepared a video.

> %%Frame%%Proposition%%thm-blowup-routing%% For every bijection $\pi$ from inputs to outputs of $B_\ell \boxtimes K_t$, there is a collection of vertex-disjoint paths connecting each input with its corresponding output under $\pi$.

### Routing bipartite graphs

Now that we can route matchings in blowups of Beneš networks, it is not much harder to route general bipartite graphs $G$ of small maximum degree $\Delta$. For this, we just decompose the edge set of $G$ into a small number of matchings: Vizing's theorem shows that $\Delta+1$ matchings suffice, but a simple greedy edge-coloring algorithm already gives us $2\Delta-1$ matchings, which suffices for us. (Assign the edges one by one to matchings, just ensure that $e$ doesn't end up in a matching that contains an edge intersecting $e$. Since each edge intersects at most $2 \Delta-2$ other edges, at least one matching will always be free.)

> %%Frame%%Proposition%%thm-Bl-comprate%%
> We have $$R(B_\ell) \in \Omega(2^\ell)$$. In particular, writing $k = |V(B_\ell)| = 2^{\ell+1} \ell$, we have $R(B_\ell) \in \Omega(k / \log k)$.

> %%Proof%%thm-Bl-comprate%%
Let $G=(L\cup R,E)$ be bipartite with $n+n$ vertices and maximum degree $5$.
We decompose $E$ into matchings $M_1,\ldots,M_9$ as above.
For $q = \lceil n/2^\ell \rceil$,
the blowup $B_\ell \boxtimes K_q$ has $n$ inputs and outputs, and each *individual* matching $M_i$ can be realized therein as a collection $P_i$ of vertex-disjoint paths. We construct a topological minor model of $G$ in $B_\ell \boxtimes K_{9q}$ by partitioning the vertices of $B_\ell \boxtimes K_{9q}$ into $9$ layers and placing the internal vertices of the paths in $P_i$ into layer $i$, while placing the endpoints into layer $1$.

## Finalizing the lower bound

We will start by proving statements about $\mathsf{ColSub}(H)$ for a **fixed** pattern graph $H$. However, bounds for a single algorithm handling arbitrary patterns $H$ will follow directly from this discussion.

As indicated in the introduction, our starting point is the following lemma:
> %%FrameSq%%Lemma%%thm-col3-slow%%3-assignment is exponential%%
> Assuming ETH, there exists a constant $\alpha \in (0, \log 3)$ such that the 3-assignment problem for degree 4 graphs cannot be solved in time $O(2^{\alpha n})$.

Note that in contrast, we do have a brute force 3-color assignment algorithm that runs in $O(3^n)$.

> %%Frame%%Theorem%%thm-comprate-bd%%Compression rate is a lower bound for the exponent%%
> Assuming ETH, there exists $\beta > 0$ such that no fixed graph $H$ admits an $O(n^{\beta R})$ polynomial-time algorithm for $\mathsf{ColSub}(H)$.

Observe that in the case where we have optimal compression rate $R(K)=k$, this lower bound is tight since the brute-force algorithm is $O(n^k)$.

> %%Proof%%thm-comprate-bd%%
> Suppose towards contradiction that there exists a $O(n^{\beta R})$-time algorithm for $\mathsf{ColSub}(H)$ for $\beta < \alpha / \log(3)$. We find a contradiction by deriving an $O(2^{\alpha n})$ time algorithm for 3-assignment.
>
> We may assume that $R \geq \frac 1 \beta > \log(3) / \alpha$ since otherwise the theorem becomes trivial.
>
> - First, *split*. Let $H$ be a fixed $k$-vertex graph of compression rate $R$. Let $G$ be a degree-$4$ graph. Then by %%Ref%%def-comprate%% we can embed $G$ into $H \boxtimes K_{\lceil n/R \rceil}$ in polynomial time. Finding a 3-coloring for $G$ is equivalent to finding a 3-assignment for the embedded graph, if the edge-chains from the subdivided edges only contain exactly one edge that is marked as an disequality edge. 
> - Next, *list* a *compatibility graph* using the algorithm from the intro. Every vertex of $H$ will be treated as a bucket, and we sort vertices of the subdivided graph into these buckets according to the embedding. For every bucket, the brute force algorithm gives a list of possible 3-colorings, giving a reduced graph $G'$ with $\leq k 3^{\lceil n/R \rceil}$ vertices. This runs in time $O(\operatorname{poly}(n) \cdot 2^{\log(3) \lceil n/R \rceil}) \leq O(2^{\alpha n})$ since $R > \log(3) / \alpha$.
> - Finally, we feed $G'$ into our impossibly fast algorithm for $\mathsf{ColSub}(H)$, which terminates in $O((\#V(G'))^{\beta R}) \leq O(2^{ \log(3) \lceil n/R \rceil \cdot \beta R}) \leq O(2^{\alpha n})$.

This allows us restore the dense result from the introduction:
> %%FrameSq%%Corollary%%thm-clique-bd%%Clique size is a lower bound for the exponent%%
> Assuming ETH, there exists $\beta > 0$ such that no $O(n^{\beta k})$ polynomial-time algorithm exists for the $k$-colored $k$-clique problem, where $k$ is fixed.

But additionally, we can now retrieve Marx's lower bound:
> %%Frame%%Corollary%%thm-Bl-bd%%Lower bound for the exponent with sparse graphs%%
> Assuming ETH, there exists a sequence of $k$-vertex graphs $(H_k)_{k=4}^\infty$ of maximum degree 4 and $\theta > 0$ such that no $O(n^{\theta k / \log k})$ polynomial-time algorithm exists for $\mathsf{ColSub}(H_k)$.

> %%Proof%%thm-Bl-bd%%  Pick $\theta= \min \{\frac {\beta}{28}, \frac{1}{14} \}$. Again we may assume $k / \log k \geq 1/\theta \geq 14$ since otherwise the corollary is trivial.
>
> Pick $\ell \in \N^\ast$ maximal such that $\# V(B̌_\ell) \leq k $. Let $H_k$ be obtained from $B̌_\ell$ by adding isolated vertices until the number of vertices is $k$. Since $\#V(B̌_\ell)  = \ell 2^{\ell+1}$, we conclude that $\ell 2^{\ell+1} \leq k < 2^{\ell+2} (\ell+1)$, which implies that $k / \log k < 2^{l+2}$. So
> $$
> R(H_k) \geq R(B̌_\ell) \geq \left\lfloor \frac{\#V(B̌_\ell)}{14 \log \#V(B̌_\ell)} \right\rfloor \geq \left\lfloor \frac{k}{14 \log k} \right\rfloor \geq \frac{k}{14 \log k} -1 \geq \frac{k}{28 \log k}.
> $$
> by %%Ref%%thm-Bl-comprate%%. Now the theorem follows from %%Ref%%thm-comprate-bd%%.
>
> 
