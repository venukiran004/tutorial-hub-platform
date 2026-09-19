/* ============================================================================
   PRACTICE P8.2 — Reinforcement Learning · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/07_Reinforcement_Learning.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p8.2",
 "lede": "**25 scenarios** from Reinforcement Learning. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each scenario out loud before revealing the answer",
  "Give the mechanism, not the slogan — the formula, the failure mode, the fix",
  "Recognise the pattern behind the question so the next variant is easy",
  "Mark the ones you got wrong and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "drill",
   "n": "26",
   "q": "What is SAC (Soft Actor-Critic)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Off-policy actor-critic with entropy regularization:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Objective: maximize E[Σ r + α × H(π(·|s))]\nH = entropy of policy → encourages exploration"
    },
    {
     "t": "p",
     "text": "**Benefits:** Off-policy (reuses data), continuous actions, automatic entropy tuning."
    },
    {
     "t": "p",
     "text": "**Explanation:** Entropy bonus prevents premature convergence. Temperature α adjusts exploration-exploitation balance. State-of-the-art for continuous control (robotics). More sample-efficient than PPO."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is Monte Carlo Tree Search (MCTS)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Tree search algorithm for decision making:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Repeat:\n1. Selection: traverse tree using UCB to balance exploration/exploitation\n2. Expansion: add new node\n3. Simulation: random playout from new node\n4. Backpropagation: update statistics along visited path"
    },
    {
     "t": "p",
     "text": "**AlphaGo:** Neural network + MCTS. Network provides prior probabilities and value estimates."
    },
    {
     "t": "p",
     "text": "**Explanation:** MCTS doesn't need complete game tree (infeasible for Go). Focuses computation on promising branches. Neural network guides search. AlphaZero: MCTS + self-play."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is reward modeling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn a neural network that predicts human-like reward:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Training data: human compares pairs (x, y_a, y_b) → y_a preferred\nLoss: Bradley-Terry model\nR(x, y_a) > R(x, y_b) for preferred responses"
    },
    {
     "t": "p",
     "text": "**Explanation:** Humans can compare but can't assign numerical rewards easily. Reward model learns from comparisons. Used in RLHF pipeline. Overoptimization risk: agent finds inputs that score high on RM but are actually bad."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is the difference between episodic and continuing tasks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Episodic:** Clear start and end (games, navigation to goal)",
      "**Continuing:** No natural end (stock trading, robot operation)"
     ]
    },
    {
     "t": "p",
     "text": "**Episodic:** Use return G = Σγᵗrₜ until terminal. **Continuing:** Use average reward or differential reward."
    },
    {
     "t": "p",
     "text": "**Explanation:** Most RL research focuses on episodic. Real-world often continuing. Discount factor γ<1 makes continuing tasks mathematically tractable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is distributional RL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Instead of learning expected value E[G], learn the FULL distribution of returns:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard: Q(s,a) = E[return]\nDistributional: Z(s,a) = full distribution of returns"
    },
    {
     "t": "p",
     "text": "**Methods:** C51 (categorical), QR-DQN (quantile regression), IQN (implicit quantiles)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Distribution captures risk/uncertainty. Can make risk-sensitive decisions. Often improves even when only using the mean (better representations)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is offline reinforcement learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn from a fixed dataset without environment interaction:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Given: dataset D = {(s, a, r, s')} collected by some policy\nLearn: optimal policy from D alone (no new exploration)"
    },
    {
     "t": "p",
     "text": "**Challenge:** Distribution shift — policy may want to take actions not in dataset."
    },
    {
     "t": "p",
     "text": "**Methods:** CQL (conservative Q-learning), BCQ, Decision Transformer."
    },
    {
     "t": "p",
     "text": "**Explanation:** Useful when: exploration is dangerous/expensive (healthcare, autonomous driving), only logged data available."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is a Decision Transformer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Cast RL as sequence prediction:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: (R₁, s₁, a₁, R₂, s₂, a₂, ..., R_t, s_t)\nR_t = desired future return (conditioning signal)\nOutput: next action a_t"
    },
    {
     "t": "p",
     "text": "**No TD learning, no Q-functions.** Train with standard sequence loss."
    },
    {
     "t": "p",
     "text": "**Explanation:** Transform RL into supervised learning. Condition on desired return → model learns to produce actions that achieve specified return level. Offline RL without complex RL machinery."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is reward hacking?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Agent finds unintended way to maximize reward without intended behavior:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Intended: clean the room → find and pick up objects\nActual: cover the mess with a blanket → no mess \"detected\" → high reward"
    },
    {
     "t": "p",
     "text": "**Examples:** Robot hand freezes to avoid dropping ball (0 reward > negative). Game agent exploits physics bugs for infinite score."
    },
    {
     "t": "p",
     "text": "**Explanation:** Reward function is a specification — any misspecification is exploitable. More capable agents = more creative exploitation. Fundamental challenge in RL alignment."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is goal-conditioned reinforcement learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Agent learns to achieve arbitrary goals:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Policy: π(a | s, g)    (action given state AND goal)\nReward: r = -||s - g||  or r = 1 if s ≈ g\n\nHindsight Experience Replay (HER):\nFailed trajectory: didn't reach goal g\nRelabel: pretend the reached state was the goal → still useful training"
    },
    {
     "t": "p",
     "text": "**Explanation:** HER dramatically improves sample efficiency for sparse rewards. Agent learns from failures by reframing them as successes for different goals."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is model predictive control with learned models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Learn environment model: ŝ_{t+1} = f(s_t, a_t)\n2. At each step: simulate H-step trajectories using model\n3. Select action sequence that maximizes predicted reward\n4. Execute first action, replan"
    },
    {
     "t": "p",
     "text": "**Explanation:** Planning with learned dynamics. Sample efficiency from model (don't need real interactions to evaluate plans). Errors compound over long horizons. Replanning helps compensate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is the difference between policy gradient and Q-learning in practice?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "Policy Gradient (PPO)",
      "Q-Learning (DQN)"
     ],
     "rows": [
      [
       "Action space",
       "Continuous ✓",
       "Discrete ✓"
      ],
      [
       "Exploration",
       "Stochastic policy",
       "ε-greedy"
      ],
      [
       "Data usage",
       "On-policy (wasteful)",
       "Off-policy (efficient)"
      ],
      [
       "Stability",
       "More stable",
       "Can diverge"
      ],
      [
       "Implementation",
       "Simpler",
       "Replay buffer + target network"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** PPO for: robotics, continuous control, RLHF. DQN for: games, discrete actions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is Proximal Policy Optimization (PPO) - Clipping?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L = min(r_t × A_t, clip(r_t, 1-ε, 1+ε) × A_t)\nr_t = π_new(a|s) / π_old(a|s)"
    },
    {
     "t": "ul",
     "items": [
      "If A_t > 0 (good action): allow r_t up to 1+ε",
      "If A_t < 0 (bad action): allow r_t down to 1-ε"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Clipping prevents too-large policy updates. If policy tries to change too much from old policy, clipping stops it. ε=0.1-0.3 typical."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is Generalized Advantage Estimation (GAE)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "A_t^(GAE) = Σ (γλ)^l × δ_{t+l}\nδ_t = r_t + γV(s_{t+1}) - V(s_t)    (TD error)\n\nλ=0: one-step TD (low variance, high bias)\nλ=1: Monte Carlo (high variance, low bias)\nλ=0.95: typical compromise"
    },
    {
     "t": "p",
     "text": "**Explanation:** GAE smoothly interpolates between TD and MC estimates. Controls bias-variance trade-off. Standard in PPO implementations. γ controls value discounting, λ controls advantage estimation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is safe reinforcement learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** RL with safety constraints:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Maximize: E[Σ r_t]\nSubject to: E[Σ c_t] ≤ d    (constraint on cost function c)"
    },
    {
     "t": "p",
     "text": "**Methods:** Constrained MDPs, safety critics, safe exploration, shielding."
    },
    {
     "t": "p",
     "text": "**Applications:** Autonomous driving (never crash), medical treatment (never harm), robotics (don't break things)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Unconstrained RL may find dangerous policies during exploration. Safe RL ensures safety even while learning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is opponent modeling in competitive RL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Model and predict opponent's behavior:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Observe opponent's actions\n2. Build model of opponent's policy/strategy\n3. Adapt own policy to exploit opponent"
    },
    {
     "t": "p",
     "text": "**Explanation:** In competitive games, optimal play depends on opponent. Fixed (non-adaptive) policy can be exploited. Opponent modeling: predict opponent → best-respond. Self-play is a special case (opponent = self)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is the credit assignment problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Determining which past actions were responsible for current reward:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Agent makes 100 actions → gets reward at step 100\nWhich of the 100 actions contributed?"
    },
    {
     "t": "p",
     "text": "**Solutions:** Temporal difference learning (bootstrapping), attention over action history, causal reasoning. **Explanation:** Fundamental RL challenge. Sparse rewards make it harder. Denser reward signals help but risk reward hacking."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is the difference between state and observation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**State:** Complete information about environment (fully observable)",
      "**Observation:** What the agent actually sees (potentially partial)"
     ]
    },
    {
     "t": "p",
     "text": "**Partially Observable MDP (POMDP):** Agent has incomplete information."
    },
    {
     "t": "p",
     "text": "**Solution:** Maintain belief state, use RNNs/Transformers to integrate history."
    },
    {
     "t": "p",
     "text": "**Explanation:** Most real-world problems are partially observable. Agent must infer hidden state from observation history."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is population-based training for RL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train population of agents with different hyperparameters:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Train N agents in parallel with different HP configurations\n2. Periodically: exploit (copy best agent's weights) + explore (mutate HP)\n3. Natural selection of best HP configurations"
    },
    {
     "t": "p",
     "text": "**Explanation:** Automatic hyperparameter tuning during training. No need for separate HP search. Adapts HP over training (early: high LR, late: low LR). Used in AlphaStar, OpenAI Five."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "What is curiosity-driven exploration?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Reward agent for visiting novel states (intrinsic motivation):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Intrinsic reward = prediction error of world model\nr_intrinsic = ||f_{predicted}(s_{t+1}) - f_{actual}(s_{t+1})||²"
    },
    {
     "t": "p",
     "text": "**Explanation:** In sparse reward environments, agent has no signal. Curiosity provides signal: states where model is uncertain (high prediction error) are worth visiting. Random Network Distillation (RND) is a popular approach."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is world modeling in RL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn a model of the environment's dynamics:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "World model: (s_t, a_t) → (s_{t+1}, r_t)\nAgent plans by \"imagining\" trajectories in the world model"
    },
    {
     "t": "p",
     "text": "**Dreamer:** Learn world model → train policy entirely in imagination."
    },
    {
     "t": "p",
     "text": "**Explanation:** Data-efficient (one real interaction generates many imagined ones). World models can generalize to new situations. Foundation for model-based RL. Connects to LLM world understanding."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is multi-task RL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Single policy for multiple tasks:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "π(a | s, task_id)   or   π(a | s, goal)"
    },
    {
     "t": "p",
     "text": "**Challenge:** Negative transfer — learning one task hurts another."
    },
    {
     "t": "p",
     "text": "**Success:** Universal policies that transfer across environments."
    },
    {
     "t": "p",
     "text": "**Explanation:** Related to meta-RL. If tasks share structure, multi-task learning helps. RT-2 (Robotics Transformer): single model for many robot manipulation tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is the difference between dense and sparse rewards?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Dense: reward at every step (distance to goal, control cost)\nSparse: reward only at goal completion (+1 at end, 0 otherwise)"
    },
    {
     "t": "p",
     "text": "**Dense:** Easier to learn, harder to specify correctly. **Sparse:** Hard to learn, easier to specify."
    },
    {
     "t": "p",
     "text": "**Explanation:** Real-world rewards are often sparse. Solutions for sparse: curiosity, HER, shaped rewards, demonstrations, curriculum."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is Atari benchmark and its significance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** 57 Atari 2600 games — standard RL benchmark:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: raw pixel frames (210×160×3)\nOutput: discrete actions (joystick + button)\nReward: game score"
    },
    {
     "t": "p",
     "text": "**Significance:** DQN (2013) showed single algorithm could play many games. First demonstration of deep RL from raw pixels."
    },
    {
     "t": "p",
     "text": "**Current state:** Superhuman on most games. MuZero achieves superhuman with planning. Agent57 is superhuman on ALL 57 games."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is GRPO (Group Relative Policy Optimization)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** RL method used in training reasoning models (DeepSeek-R1):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. For each prompt, generate group of responses\n2. Score each response (correctness, quality)\n3. Use relative ranking within group as advantage estimate\n4. PPO-style update using group-relative advantages"
    },
    {
     "t": "p",
     "text": "**Explanation:** No separate reward model needed. Response quality evaluated by objective criteria (math correctness, code execution). Self-improvement through group comparison. Key to DeepSeek-R1's reasoning capability."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "How is RL used in LLM training beyond RLHF?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. RLHF: align with human preferences (ChatGPT)\n2. RLAIF: align with AI feedback (Constitutional AI)\n3. Reasoning: reward correct chain-of-thought (DeepSeek-R1)\n4. Tool use: reward successful tool calls\n5. Code generation: reward passing test cases\n6. Math: reward correct solutions"
    },
    {
     "t": "p",
     "text": "**Explanation:** RL is becoming central to LLM capability improvement. Beyond alignment, RL teaches reasoning, planning, tool use. Inference-time compute (thinking longer) is a form of RL-guided search."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
