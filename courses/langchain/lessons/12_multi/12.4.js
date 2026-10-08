EC.receiveLesson({
  id: "12.4",
  lede: "A team is 10.1's subgraph with agents inside: a compiled graph the top-level supervisor treats as **one node**. Which means the arithmetic compounds \u2014 a two-level hierarchy pays **two coordination turns per unit of work**, one at each level. 10.1's rules apply unchanged: state crosses by **key name**, so a team's internal scratch keys merge upward if the parent declares them; and the team's internal turns are **one superstep** of the parent, so its supervisor's decisions do not appear in the parent's history. That last point matters more here than in 10.1, because the thing hidden is an **agent's decisions** \u2014 exactly what you want to see when the output is wrong.",
  objectives: [
    "Build a team as a compiled graph used as a node",
    "Say where the state boundary falls and how to control it",
    "Show what the parent's history hides",
    "Compute what each level of hierarchy costs",
    "State the depth at which it stops paying"
  ],
  prerequisites: ["12.2", "10.1"],
  blocks: [
    { t: "h2", n: "01", id: "team", text: "A team is a graph used as a node", sub: "With agents inside" },
    { t: "code", lang: "text", title: "Two levels",
      code: "top -> research\nteam_sup -> searcher\nsearcher\nteam_sup -> FINISH\ntop -> FINISH\n\nmodel calls: top 2, team 2",
      caption: "**Two** coordination turns per unit of work \u2014 one at each level." },
    { t: "p", text: "The inner supervisor decides within the team; the outer one decides which team acts. Both are 12.1's coordination calls that do no work, so a hierarchy multiplies the overhead rather than adding to it." },
    { t: "h2", n: "02", id: "boundary", text: "Where the state boundary falls", sub: "10.1's rule, unchanged" },
    { t: "code", lang: "text", title: "The team's messages merged upward",
      code: "-            HumanMessage('research refunds')\nsearcher     AIMessage('found 3 sources')",
      caption: "Both schemas declare `messages`, so the team's output reached the parent." },
    { t: "callout", kind: "warn", title: "Which is right for messages and wrong for scratch state", body: [
      { t: "p", text: "State crosses by key name with no mapping layer (10.1). A team with a `candidates` key that the top level also declares will have its **working notes merged upward** \u2014 and a team whose key the parent does **not** declare has its update silently discarded." },
      { t: "p", text: "So the boundary is a **schema design** decision: name the team's internal keys so they cannot collide, or wrap the team in a function with an explicit mapping. The second is better across a team boundary, because then the interface is code a rename breaks visibly." }
    ] },
    { t: "h2", n: "03", id: "hidden", text: "What the parent's history hides", sub: "An agent's decisions" },
    { t: "code", lang: "text", title: "The top-level checkpoints",
      code: "top-level checkpoints: 5\n  step=2   next=('top',)        trace=['top -> research', 'team_sup -> searcher', ...]\n  step=1   next=('research',)   trace=['top -> research']\n  step=0   next=('top',)        trace=[]",
      caption: "The team's internal turns arrived together, in one superstep." },
    { t: "callout", kind: "insight", title: "This matters more than in 10.1", body: [
      { t: "p", text: "`get_state(cfg, subgraphs=True)` reaches inside. But the default is opacity, and what is opaque here is **an agent's decisions** \u2014 which worker the team's supervisor chose and why." },
      { t: "p", text: "That is precisely the information you want when the output is wrong, and 12.8's blame problem is already hard without a layer of the reasoning being invisible by default. So a hierarchy makes the hardest multi-agent failure harder." }
    ] },
    { t: "h2", n: "04", id: "cost", text: "What each level costs", sub: "Simple and unforgiving arithmetic" },
    { t: "p", text: "Each level adds three things:" },
    { t: "ul", items: [
      "one **coordination model call** per unit of work at that level",
      "one **state boundary** to get right",
      "one layer of **opacity** in the parent's trace"
    ] },
    { t: "code", lang: "text", title: "Which compounds",
      code: "one level    2 coordination calls before any work\ntwo levels   4\nthree levels 6",
      caption: "On a task that needs one worker turn." },
    { t: "h2", n: "05", id: "depth", text: "The depth at which it stops paying", sub: "One level" },
    { t: "callout", kind: "mental", title: "One level of teams, and only when the teams are real", body: [
      { t: "p", text: "Real meaning 12.1's structural reasons: different **permissions**, different **owners**, or a context budget that genuinely does not fit. A team that exists because the agent list was getting long is 10.1's \u201cthis graph is getting long\u201d one level up \u2014 and that was the weakest reason to nest anything." },
      { t: "p", text: "Beyond one level the structure is mirroring an org chart, and 12.1 already noted that an org chart solves human bandwidth and accountability problems that do not apply here. Importing the shape imports the cost without the reason." }
    ] },
    { t: "exercise", kind: "build", title: "Build a hierarchy and find what it hides",
      difficulty: "advanced", minutes: 32,
      body: "Build a team as a compiled graph with its own supervisor and worker, then use it as a node in a top-level graph with its own supervisor. Count the coordination calls at each level. Show where the state crossed the boundary and explain what would happen to a team-internal key. Then run it with a checkpointer and show what the parent's history does and does not contain. Finally compute what each level of hierarchy costs and state the depth at which it stops paying.",
      requirements: ["Build a team as a compiled graph and use it as a node",
        "Count the coordination calls at each level",
        "Show which state crossed the boundary and why",
        "Explain what happens to a team-internal key the parent also declares",
        "Show the parent's checkpoint history and what is missing from it",
        "Explain why that opacity matters more here than for a plain subgraph",
        "Compute the cost per level and state the recommended depth"],
      hint: "Look at what the parent's history shows for the team's internal supervisor decisions. The absence is the finding.",
      solution: { lang: "python", title: "x1204.py \u2014 two coordination turns per unit of work",
        code: 'research_team = tg.compile()          # a team is a compiled graph\n\nog.add_node("research", research_team)   # used as ONE node\nog.add_conditional_edges("top", top_route, {"research": "research", END: END})\nog.add_edge("research", "top")\n\n# the team\'s internal turns are one superstep of the parent\nhist = list(app.get_state_history(cfg))\napp.get_state(cfg, subgraphs=True)       # reaches inside',
        out: "==============================================================================\nPART 1 -- a team is a graph used as a node\n==============================================================================\n  10.1's subgraph, with agents inside. a 'research team' is a\n  compiled graph; the top-level supervisor treats it as one node.\n\n    top -> research\n    top -> research\n    team_sup -> searcher\n    searcher\n    team_sup -> FINISH\n    top -> FINISH\n\n  model calls: top 2, team 2\n  so a two-level hierarchy pays TWO coordination turns per unit of\n  work -- one at each level.\n==============================================================================\nPART 2 -- where the state boundary falls\n==============================================================================\n  10.1's rule applies unchanged: state crosses by KEY NAME. so the\n  team's messages merged into the top level's messages, because both\n  schemas declare that key.\n\n    -            HumanMessage('research refunds')\n    searcher     AIMessage('found 3 sources')\n\n  which is usually what you want for messages and usually NOT what\n  you want for a team's internal scratch state. a team with a\n  'candidates' key that the top level also declares will have its\n  working notes merged upward.\n\n  so the boundary is a SCHEMA DESIGN decision: name the team's\n  internal keys so they do not collide, or wrap the team in a\n  function with an explicit mapping (10.1).\n==============================================================================\nPART 3 -- what the parent's history shows\n==============================================================================\n  top-level checkpoints: 5\n  the team's internal turns are ONE superstep of the parent, so its\n  supervisor's decisions do not appear:\n    step=3   next=()             trace=['top -> research', 'top -> research', 'team_sup -> searcher', 'searcher', 'team_sup -> FINISH', 'top -> FINISH']\n    step=2   next=('top',)       trace=['top -> research', 'top -> research', 'team_sup -> searcher', 'searcher', 'team_sup -> FINISH']\n    step=1   next=('research',)  trace=['top -> research']\n    step=0   next=('top',)       trace=[]\n\n  get_state(cfg, subgraphs=True) reaches inside. which matters more\n  here than in 10.1, because the thing hidden is an AGENT's\n  decisions -- exactly what you want to see when the output is wrong.\n==============================================================================\nPART 4 -- the depth at which it costs more than it buys\n==============================================================================\n  the arithmetic is simple and unforgiving. each level adds:\n\n    one coordination model call per unit of work at that level\n    one state boundary to get right\n    one layer of opacity in the parent's trace\n\n  so two levels is four model calls before any work happens on a\n  task that needs one worker turn, and three levels is six.\n\n  the honest guidance: ONE level of teams, and only when the teams\n  correspond to something real -- different permissions, different\n  owners, or a context budget that genuinely does not fit (12.1).\n\n  beyond that the structure is mirroring an org chart, and 12.1\n  already noted that an org chart solves human bandwidth and\n  accountability problems that do not apply here.",
        notes: [
          { t: "p", text: "**A team is a compiled graph used as one node**, which is 10.1's subgraph with agents inside." },
          { t: "p", text: "**A two-level hierarchy pays two coordination turns per unit of work** \u2014 one at each level, so the overhead multiplies rather than adds." },
          { t: "p", text: "**State crosses by key name**, so the team's messages merged upward because both schemas declare that key." },
          { t: "p", text: "**Which is right for messages and wrong for scratch state** \u2014 a team's working notes merge upward if the parent declares the key, and are discarded if it does not." },
          { t: "p", text: "**So the boundary is a schema design decision**: name internal keys so they cannot collide, or wrap the team with an explicit mapping." },
          { t: "p", text: "**The team's internal turns are one superstep of the parent**, so its supervisor's decisions do not appear in the parent's history." },
          { t: "p", text: "**Which matters more than in 10.1**, because what is hidden is an agent's decisions \u2014 exactly what you want when the output is wrong." },
          { t: "p", text: "**Each level adds a coordination call, a state boundary and a layer of opacity.**" },
          { t: "p", text: "**So: one level of teams, and only when they correspond to permissions, owners or a context budget** \u2014 beyond that it is mirroring an org chart." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the three-level hierarchy nobody could trace", body: [
      { t: "p", text: "A system has a top supervisor, three team supervisors and nine workers. An output is wrong. The trace shows the top supervisor choosing a team and the final answer, with everything between arriving in two supersteps." },
      { t: "p", text: "Each level's internal decisions are one superstep of the level above, so the parent's history contains none of the team supervisor's choices and none of the worker's reasoning. Reconstructing why the answer is wrong means fetching subgraph state at two levels, and the coordination calls alone are six before any work happens." },
      { t: "p", text: "The structural response is to flatten to one level and give the teams a reason to exist \u2014 permissions, owners or a context budget \u2014 or to drop the hierarchy for a flat supervisor over nine workers, which costs one coordination turn instead of three. The transferable point is that hierarchy depth multiplies both the cost and the opacity, and the opacity hides exactly the reasoning you need when a multi-agent output is wrong." }
    ] }
  ],
  takeaways: [
    "**A team is a compiled graph used as one node** \u2014 10.1's subgraph with agents inside.",
    "**A two-level hierarchy pays two coordination turns per unit of work.**",
    "**So the overhead multiplies rather than adds.**",
    "**State crosses by key name**, so a team's messages merge upward.",
    "**Right for messages, wrong for scratch state** \u2014 working notes merge or are discarded.",
    "**So the boundary is a schema design decision**, or a wrapper with an explicit mapping.",
    "**The team's internal turns are one superstep of the parent.**",
    "**So its supervisor's decisions do not appear in the parent's history.**",
    "**Which matters more than in 10.1**, because an agent's decisions are what is hidden.",
    "**And that is exactly what you want when the output is wrong** \u2014 so hierarchy makes 12.8 harder.",
    "**Each level adds a coordination call, a state boundary and a layer of opacity.**",
    "**Two levels is four coordination calls before any work; three is six.**",
    "**One level of teams, and only when the teams correspond to something real.**",
    "**Beyond that it is mirroring an org chart** \u2014 importing the cost without the reason."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "What does each additional level of agent hierarchy cost?",
      options: ["Only extra latency from the deeper call stack",
        "A coordination model call per unit of work at that level, a state boundary to get right, and a layer of opacity in the parent's trace",
        "Nothing, since subgraphs share the parent's checkpointer",
        "A separate checkpointer per level"],
      answer: 1,
      why: "The coordination call is the measurable part: a two-level hierarchy spends four model calls deciding before any work happens on a task needing one worker turn. The state boundary is a correctness risk because state crosses by key name. And the opacity is the one that bites during debugging, since each level's internal decisions collapse into one superstep of the level above." },
    { stem: "A team's internal key is also declared by the parent schema. What happens?",
      options: ["The parent's value shadows the team's",
        "The team's update merges upward into the parent's state, because state crosses by key name",
        "compile() rejects the collision",
        "The key becomes private to the team"],
      answer: 1,
      why: "There is no mapping layer, so matching is by name and the team's working notes become part of the parent's state. The converse is equally silent: a team key the parent does not declare has its update discarded. Both are reasons to name internal keys defensively or to wrap the team in a function with an explicit mapping." },
    { stem: "Why does a subgraph's opacity matter more for a team of agents than for a plain subgraph?",
      options: ["Agent subgraphs produce more checkpoints",
        "What is hidden is an agent's decisions \u2014 which worker was chosen and why \u2014 and that is exactly what you need when the output is wrong",
        "Teams cannot be inspected with subgraphs=True",
        "Agents write larger state objects"],
      answer: 1,
      why: "A plain subgraph hides deterministic computation you can re-derive by reading the code. A team hides a model's routing decisions, which are not re-derivable. Since attributing a wrong multi-agent output is already the hardest failure mode, a layer of invisible reasoning makes it substantially harder \u2014 even though subgraphs=True can reach it when you know to look." },
    { stem: "What is the recommended depth for agent hierarchies?",
      options: ["As deep as the domain naturally decomposes",
        "One level, and only when the teams correspond to different permissions, owners or a context budget",
        "Two levels, to balance cost and organisation",
        "No limit, provided each team is independently tested"],
      answer: 1,
      why: "Each level multiplies coordination cost and opacity, so the structure has to buy something structural. Teams that exist because the agent list was getting long are the same weak justification as splitting a graph because it was getting long. Deeper than one level is usually mirroring an org chart, which solves human bandwidth and accountability problems that do not apply here." }
  ] },
  interview: { title: "Interview practice", sub: "Hierarchical teams", questions: [
    { level: "core", q: "How would you structure a system with many agents?",
      strong: "A strong answer prefers flat and justifies any nesting.",
      answer: [
        { t: "p", text: "Flat, with one supervisor, unless the groupings correspond to something structural \u2014 different permissions, different owners, or a context budget that genuinely does not fit." },
        { t: "p", text: "The reason is arithmetic. A team is a compiled graph used as a node, so each level adds a coordination model call per unit of work. I measured a two-level hierarchy paying two coordination turns for one worker turn \u2014 four model calls before anything happened. Three levels is six." },
        { t: "p", text: "Each level also adds a state boundary to get right, and state crosses by key name with no mapping layer \u2014 so a team's internal scratch key that the parent happens to declare merges upward, and one it does not declare is silently discarded." },
        { t: "p", text: "And each level adds opacity. The team's internal turns are one superstep of the parent, so the parent's history does not contain the team supervisor's decisions. That matters more for agents than for a plain subgraph, because what is hidden is a model's routing choices rather than deterministic code I could re-read." }
      ] },
    { level: "advanced", q: "What makes a deep agent hierarchy hard to debug?",
      strong: "A strong answer connects opacity to the blame problem.",
      answer: [
        { t: "p", text: "Each level's decisions are invisible from the level above by default, and what is invisible is reasoning rather than computation." },
        { t: "p", text: "A subgraph runs as one superstep of its parent, so the parent's checkpoint history shows the team being invoked and the team's output arriving \u2014 and nothing about which worker the team's supervisor chose or why. You can reach it with get_state and subgraphs=True, but the default is opacity and you have to know to look." },
        { t: "p", text: "That compounds with the hardest multi-agent failure, which is attribution. When an output is wrong, the useful question is which agent produced the wrong part and what it was given \u2014 and often the honest answer is that each agent was reasonable given its input, and the system was not. Hierarchy removes a layer of the evidence for that." },
        { t: "p", text: "So with three levels you are reconstructing a decision chain from two layers of subgraph state, having already paid six coordination calls. I have seen that make a wrong answer effectively unexplainable." },
        { t: "p", text: "What I would do instead is flatten to one supervisor over all the workers, which costs one coordination turn, keeps every decision in one history, and makes attribution a matter of reading the message names." }
      ] },
    { level: "core", q: "How would you debug a wrong answer from a hierarchical agent system?",
      strong: "A strong answer reaches into the subgraph state deliberately.",
      answer: [
        { t: "p", text: "By reaching into the subgraph state explicitly, because the default view hides exactly the layer I need." },
        { t: "p", text: "The parent's checkpoint history shows the team being invoked and its output arriving \u2014 the team's internal supervisor decisions are one superstep of the parent, so they are absent. get_state with subgraphs=True reaches them, and you have to know to ask." },
        { t: "p", text: "So my sequence would be: read the parent's history to find which team produced the wrong part, then fetch that team's subgraph state to see which worker its supervisor chose and what that worker was given." },
        { t: "p", text: "And I would check the state boundary early, because it is a silent failure. State crosses by key name, so a team key the parent does not declare is discarded without a word, and one it does declare merges upward \u2014 both of which look like a worker producing nothing or the wrong thing." },
        { t: "p", text: "What I would do afterwards is reduce the depth. Three levels means reconstructing a decision chain from two layers of subgraph state, having already paid six coordination calls \u2014 and the thing hidden is a model's reasoning, which I cannot re-derive by reading code the way I could for deterministic nodes." }
      ] }
  ] }
});
