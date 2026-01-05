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

For the proof, we first consider the $3$-coloring problem, which has no $2^{o(n)}$ time algorithms under ETH. (The standard reduction from 3-SAT gives this when combined with the sparsification lemma: This lemma says that ETH already rules out $2^{o(n)}$ time algorithms for $n$-variable 3-SAT *with just $O(n)$ clauses*.) The lower bound even holds on graphs of maximum degree $4$.

For technical reasons, we generalize this problem slightly: Besides the usual *"disequality"* edges in the $3$-coloring problem that require distinct colors at their endpoints, we also allow *"equality"* edges that require endpoints to have the same color. We call an assignment from $V(G)$ to $\{1,2,3\}$ proper if it satisfies all conditions imposed by edges. Since this *$3$-assignment problem* generalizes $3$-coloring, it admits no $2^{o(n)}$ time algorithms under ETH.

The basic idea behind the lower bound is this: 
- We transform an $n$-vertex instance $G$ for the $3$-assignment problem into an equivalent blown up $H$-subgraph problem instance $G'$ with approximately $3^{n/k}$ vertices. 
- An $n^{o(k)}$-time algorithm for the $H$-subgraph problem would then imply a $2^{o(n)}$-time algorithm for the generalized $3$-coloring problem. But this contradicts ETH.


### Cliques

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

In fact, the partition of $G$ could be so nice that all non-edges $ij \notin E(H)$ of a specific $k$-vertex graph $H$ of interest give rise to empty pairs. If $t = \lceil n/k \rceil$ denotes the maximum block size, then $G$ would fit into the $t$-**blowup** of $H$, written $H \boxtimes K_t$. This is the graph obtained by turning each vertex $v$ into a $t$-clique and turning edges into complete bipartite graphs. In this very nice situation, we have:

> If $G$ is a subgraph of $H \boxtimes K_t$, then the proper assignments of $G$ correspond bijectively to the $H$-copies in $G'$. 

Imagine now that, for some reason, the $3$-assignment problem stayed hard under ETH (with an $2^{\Omega(n)}$ time lower bound) when the $n$-vertex input graph $G$ is given as a subgraph of $H \boxtimes K_{n/k}$. Then the above correspondence between assignments of $G$ and $H$-copies in $G'$ directly gives an $n^{\Omega(k)}$ lower bound for the colorful $H$-subgraph problem, because testing for an $H$-subgraph in $G'$ is equivalent to testing for a proper assignment in $G$.

### Compression rate

Just before, we have learned the following: When the $3$-assignment problem has an $2^{\Omega(n)}$ time lower bound on graphs $G$ that fit into the $\lceil n/k \rceil$-blowup of $H$, then testing for $H$-copies in $n$-vertex graphs has an $n^{\Omega(k)}$ lower bound.

In many cases, $G$ does not fit into the $\lceil n/k \rceil$-blowup of $H$, but only into an $n/R$-blowup of $H$ for some $R \leq k$. It certainly fits when $R=1$, as the $n$-blowup of $H$ contains an $n$-clique. Let us say that $H$ admits **compression rate** $R \in \mathbb N$ if the $3$-assignment problem has an $2^{\Omega(n)}$ time lower bound on graphs $G$ that fit into the $\lceil n/R \rceil$-blowup of $H$. An $n^{\Omega(R)}$ lower bound then follows for the colorful $H$-subgraph problem by our argument above. We are good if $R \in \Omega(k)$, but we'll usually get $R \in \Omega(k/ \log k)$.

Our [original paper](https://arxiv.org/abs/2410.02606) uses a closely related but somewhat more complicated notion, the *linkage capacity* $\gamma(H)$. For this note, the more informal notion of compression rate above suffices.

## Beneš networks

%%Applet%%benes%%

In the remainder of this note, we construct $k$-vertex graphs $B_l$ of maximum degree $4$ with compression rate $R = \Omega(k / \log k)$. These graphs are so-called **Beneš networks**, first discovered in the context of communication networks. With the reduction from the previous section, this implies:

> The colorful $H$-subgraph problem for Beneš networks requires $n^{\Omega (k/\log k)}$ time under ETH.

This gives us Marx's original lower bound for sparse $H$-subgraph problems, which is the best known lower bound under ETH for $k$-vertex pattern graphs with $O(k)$ edges.

### Construction

The Beneš networks are recursively defined graphs $B_\ell$ for $\ell \in \mathbb N$. The graph $B_\ell$ has $2^\ell$ input and $2^\ell$ output vertices, maximum degree $4$, and $O(2^\ell \ell)$ vertices in total. Or, writing $s=2^\ell$, it has $k=O(s \log s)$ vertices. The graphs are built as follows: 
- $B_1$ is a complete bipartite graph on $2+2$ vertices.
- $B_{\ell+1}$ is built from two vertex-disjoint copies of $B_\ell$: For each index $i \in [2^\ell]$, we create two fresh input vertices and make them adjacent to input $i$ from each of the two $B_\ell$-copies. We do the same with outputs. The inputs and outputs of $B_{\ell+1}$ are the new vertices created this way.

Note that the inputs come in pairs of vertices with the same neighborhood; such pairs are called twins. Of course, the same holds for the outputs.

If you want, you can try building your own Beneš network below.

%%Applet%%construction%%

### Routing matchings in blowups

For our compression result, we consider blowups $B_\ell \boxtimes K_t$ of Beneš networks. The inputs/output vertices of $B_\ell \boxtimes K_t$ are the blowups of input/output vertices in $B_\ell$. We show the following:

> %%Frame%%Proposition%%thm-blowup-routing%%$B_\ell \boxtimes K_t$ can route input-output matchings%% For every bijection $\pi$ from inputs to outputs of $B_\ell \boxtimes K_t$, there is a collection of vertex-disjoint paths connecting each input with its corresponding output under $\pi$.

> %%Proof%%thm-blowup-routing%% We prove this by fixing $t$ arbitrary and performing induction over $\ell$. The statement is trivial for $B_1 \boxtimes K_t$, because this graph is isomorphic to $K_{2t,2t}$. 
>
> For the induction step, we assume that $B_\ell \boxtimes K_t$ can route input-output matchings and show it for $B_{\ell+1} \boxtimes K_t$. Recall that $B_{\ell+1}$ consists of two subnetworks $B^\uparrow$ and $B^\downarrow$ isomorphic to $B_\ell$. Then $B_\ell \boxtimes K_t$ consists of subnetwork blowups $B^\uparrow \boxtimes K_t$ and $B^\downarrow \boxtimes K_t$.
>
> A collection of paths $\mathcal P$ from inputs to outputs in $B_{\ell+1} \boxtimes K_t$ is vertex-disjoint if (but not only if) the following three conditions are satisfied:
> 1. For $i \in [2^\ell]$, write $v_i$ and $v'_i$ for the two inputs of $B_{\ell+1}$ adjacent to input $i$ of the two subnetworks. Let $a$ and $a'$ be vertices in $B_{\ell+1} \boxtimes K_t$ from the $t$-blowups of $v_i$ and $v'_i$, respectively. The **first condition** is that the two paths starting at $a$ and $a'$ should go into different subnetwork blowups.
> 2. The same holds for outputs: If $w_i$ and $w_{2^\ell +i}$ are the outputs adjacent to output $i$ of the subnetworks, then the paths in $\mathcal P$ ending there must come from different subnetworks.
> 3. Within each subnetwork, $\mathcal P$ must induce vertex-disjoint paths from inputs to outputs.



### Compression rate

The routing results from before give rise to good embeddability properties in the following sense.

> %%Frame%%Definition%%def-comprate%%Compression rate%%
> The compression rate $R(H)$ of a $k$-vertex graph $H$ is the maximum $R \in [k]$ such that for every graph $G$ of arbitrary vertex-count $n$, but restricted maximum degree $\leq 4$, the blowup $H \boxtimes K_{\lceil n/R \rceil}$ contains $G$ as a **topological minor**.
> This means $G$ is a subgraph of $H \boxtimes K_{\lceil n/R \rceil}$ after subdividing the edges of $G$ appropriately.
>
> Furthermore, for fixed $H$ these topological minors can be found in polynomial time in $n$.

For example, the complete graph $H=K_k$ has optimal (large) compression rate $R(K_k)=k$. However, we will instead use modified Beneš networks to sacrifice compression rate for lower density. Topological minors will live in special vertex subsets:

> %%Frame%%Definition%%def-matching-linkedness%%Matching-linkedness%%
> We call a vertex-set $X$ in a graph $F$ **matching-linked** if, for every matching $M$ with vertices from $X$ (but with $M$ possibly containing edges not present in $F$), there exist disjoint $u$-$v$-paths in $F$ realizing the edges $uv \in M$.

This is vaguely similar to the property described in %%Ref%%thm-blowup-routing%%, however we need a slight modification to our Beneš construction from before:
> %%Frame%%Definition%%def-aug-benes%%$B̌_\ell$%%
> Denote by $(w_j)_j$ the output vertices of the Beneš network $B_\ell$. The **augmented Beneš network $B̌_\ell$** is obtained from $B_\ell$ by adding an edge between
outputs $w_{2i−1}$ and $w_{2i}$, for each $i \in [2^{\ell-1}]$.

These augmented Beneš networks will play the role of the pattern graphs we have thus far evasively called $H$.

> %%Frame%%Lemma%%thm-augmented-linkedness%%Matching-linkedness%%
> The augmented Beneš blowups $B̌_\ell \boxtimes K_{t}$ contain matching-linked subsets of size $\#X = t 2^\ell$.

> %%Proof%%thm-augmented-linkedness%%
> We choose $X=\{v_i^{(j)}: i \in [2^\ell], j \in [t]\} \subset V(B̌_\ell \boxtimes K_{t})$ as the inputs from all the blowup layers.
>
> Use %%Ref%%thm-blowup-routing%%: If $v_{i}^{(j)}v_{i'}^{(j')}\subset X$ is the $m 2^{\ell-1}+s$'th input-pair in the matching for $s \in [2^{\ell-1}]$, route the input $v_{i}^{(j)}$ to the odd output $w_{2s-1}^{(m+1)}$, and route the other input $v_{i'}^{(j')}$ to the even output $w_{2s}^{(m+1)}$. After this, the paths are found by bridging the obtained pairs of routes with the edges $w_{2s-1}^{(m+1)}w_{2s}^{(m+1)}$.

> %%Frame%%Proposition%%thm-Bl-comprate%%Compression rate of $B̌_\ell$%% 
> We have $$R(B̌_\ell) \geq \left\lfloor \frac{2^\ell}{7} \right\rfloor$$ In particular, denoting by $k=2^{\ell+1} \ell$ the number of vertices in the graph, we have $R(B̌_\ell) \geq \left\lfloor \frac{k}{14 \log k} \right\rfloor$

> %%Proof%%thm-Bl-comprate%%
> The second bound follows from the first because
> $$
> R(B̌_\ell) 
>   \geq \left\lfloor \frac{2^{\ell+1} \ell}{14 \ell} \right\rfloor
>   \geq \left\lfloor \frac{2^{\ell+1} \ell}{14 (\ell+1+\log\ell)} \right\rfloor
>   = \left\lfloor \frac{k}{14 \log k} \right\rfloor
> $$
>
> To establish the first bound, let $G$ be an $n$-vertex graph of maximum degree $4$. Let $\tilde{R} = \left\lfloor \frac{2^\ell}{7} \right\rfloor$. Since
> $$
> \left\lceil \frac{n}{\tilde{R}} \right\rceil
> = \left\lceil \frac{n}{\lfloor 2^\ell / 7 \rfloor} \right\rceil
> \geq \frac{7n}{2^\ell},
> $$
> we see by %%Ref%%thm-augmented-linkedness%% that $B̌_\ell \boxtimes K_{\lceil n / \tilde{R} \rceil}$ contains a matching linked subset of size $\geq 7n$, write $X \equiv [n] \times [7]$ (ignore excess vertices).
> Also assume $V(G)=[n]$. The greedy algorithm can find a proper $7$-coloring $M_1, \ldots, M_7$ of the *edges* of $G$. This gives rise to a matching $M = (M_1 \times \{1\}) \sqcup \dots \sqcup (M_7 \times\{7\})$ on $X$. Since $X$ is matching-linked, we get disjoint paths realizing $M$. Finally, for every non-isolated vertex $v \in [n]$ with edges in $M_{i(1)}, \ldots, M_{i(p)}$, connect all $(v, i(j)) \in X$, $j \in [p-1]$ to $(v,i(p))$. Together those edge sets form a topological minor embedding of $G$ in $B̌_\ell \boxtimes K_{\lceil n / \tilde{R} \rceil}$, so $R \geq \tilde{R}$.

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
