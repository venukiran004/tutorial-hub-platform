/* ============================================================================
   PRACTICE P8.1 — Reinforcement Learning · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/07_Reinforcement_Learning.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p8.1",
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
   "n": "1",
   "q": "What is reinforcement learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Agent learns to make decisions by interacting with an environment to maximize cumulative reward:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Agent → Action → Environment → (State, Reward) → Agent → ...\nGoal: learn policy π(a|s) that maximizes E[Σ γᵗrₜ]"
    },
    {
     "t": "p",
     "text": "**Key elements:** State (s), Action (a), Reward (r), Policy (π), Discount factor (γ)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Unlike supervised learning (labeled data) or unsupervised (no labels), RL learns from interaction and delayed rewards. Trial and error. Credit assignment: which action caused the reward?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is the difference between model-free and model-based RL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Model-free:** Learn policy/value directly from experience. No environment model. (DQN, PPO)",
      "**Model-based:** Learn a model of the environment, plan using it. (Dreamer, MuZero)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Model-free: simpler, more data-hungry. Model-based: data-efficient, but model errors compound. Model-based is trending for complex tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is the difference between value-based and policy-based methods?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Value-based:** Learn value function Q(s,a) or V(s). Derive policy from values. (DQN)",
      "**Policy-based:** Directly learn policy π(a|s). (REINFORCE, PPO)",
      "**Actor-Critic:** Both — actor (policy) + critic (value function). (A2C, A3C, PPO)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Value-based: discrete actions only (argmax). Policy-based: continuous actions, stochastic policies. Actor-critic combines benefits."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is Q-learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn action-value function Q(s,a) — expected return from taking action a in state s:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Q(s,a) ← Q(s,a) + α × [r + γ × max_a' Q(s',a') - Q(s,a)]"
    },
    {
     "t": "p",
     "text": "**Optimal policy:** π*(s) = argmax_a Q(s,a)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Off-policy (can learn from any experience). Tabular Q-learning for small state spaces. Deep Q-Networks (DQN) for large/continuous states."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is DQN (Deep Q-Network)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use neural network to approximate Q(s,a):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Key innovations:\n1. Experience replay: store transitions, sample random batches\n2. Target network: separate network for target Q values (updated periodically)\n3. ε-greedy exploration: random action with probability ε"
    },
    {
     "t": "p",
     "text": "**Why experience replay:** Breaks correlation in sequential data. Reuses past experience. Like mini-batch training."
    },
    {
     "t": "p",
     "text": "**Why target network:** Stabilizes training by reducing moving target problem."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is policy gradient (REINFORCE)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Directly optimize policy parameters by gradient ascent on expected return:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "∇J(θ) = E[Σ ∇log π_θ(aₜ|sₜ) × Gₜ]\nwhere Gₜ = Σ γᵏ r_{t+k}  (return from time t)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Increase probability of actions that led to high return. Decrease for low return. High variance (reduce with baseline). Works with continuous actions. No need for Q-function."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is the actor-critic architecture?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Actor: π_θ(a|s) — policy network. Decides what to do.\nCritic: V_w(s) or Q_w(s,a) — value network. Evaluates how good state/action is.\n\nUpdate actor: ∇J = E[∇log π(a|s) × A(s,a)]  where A = advantage\nUpdate critic: minimize (V(s) - target)²"
    },
    {
     "t": "p",
     "text": "**Advantage:** A(s,a) = Q(s,a) - V(s) — how much better is action a than average."
    },
    {
     "t": "p",
     "text": "**Explanation:** Reduces variance of pure policy gradient. Critic provides better learning signal than raw returns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is PPO (Proximal Policy Optimization)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Constrained policy update that prevents too-large changes:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L_CLIP = E[min(r(θ)×A, clip(r(θ), 1-ε, 1+ε)×A)]\nwhere r(θ) = π_new(a|s) / π_old(a|s)  (probability ratio)"
    },
    {
     "t": "p",
     "text": "**Key:** Clips the policy ratio to [1-ε, 1+ε], preventing dramatic policy changes."
    },
    {
     "t": "p",
     "text": "**Explanation:** Most popular RL algorithm. Stable training. Works with neural networks. Used in RLHF for LLMs, game AI, robotics. Simple to implement."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is the exploration-exploitation trade-off?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Exploration:** Try new actions to discover better strategies",
      "**Exploitation:** Use best known action to maximize immediate reward"
     ]
    },
    {
     "t": "p",
     "text": "**Methods:**"
    },
    {
     "t": "ol",
     "items": [
      "ε-greedy: random action with probability ε",
      "Boltzmann/softmax: action probability proportional to Q values",
      "UCB: upper confidence bound (optimism in face of uncertainty)",
      "Entropy bonus: encourage diverse actions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Too much exploration → wasteful. Too much exploitation → miss better strategies. Balance changes over time (more exploration early, more exploitation later)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is the reward shaping problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Designing reward functions that lead to desired behavior:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Sparse reward: +1 for reaching goal, 0 otherwise (hard to learn)\nDense reward: small rewards for progress (faster learning, risk of reward hacking)"
    },
    {
     "t": "p",
     "text": "**Reward hacking:** Agent finds unintended way to maximize reward without achieving goal."
    },
    {
     "t": "p",
     "text": "**Example:** Racing game agent drives in circles collecting penalty avoidance rewards instead of finishing race."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is the discount factor γ?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Return = r₀ + γr₁ + γ²r₂ + ...\nγ = 0: only care about immediate reward (myopic)\nγ = 1: care equally about all future rewards (far-sighted)\nγ = 0.99: common choice — gradual discounting"
    },
    {
     "t": "p",
     "text": "**Explanation:** Discounting makes math tractable (bounded returns). Also models uncertainty about future. Higher γ → agent plans further ahead. Too high → unstable training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is experience replay?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Store past transitions (s, a, r, s') in a buffer. Sample random batches for training:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "buffer = ReplayBuffer(max_size=1_000_000)\nbuffer.store(state, action, reward, next_state, done)\nbatch = buffer.sample(batch_size=256)"
    },
    {
     "t": "p",
     "text": "**Benefits:**"
    },
    {
     "t": "ol",
     "items": [
      "Breaks temporal correlation (i.i.d. training data)",
      "Reuses past experience (data efficiency)",
      "Smooth learning updates"
     ]
    },
    {
     "t": "p",
     "text": "**Prioritized replay:** Sample more important transitions (high TD error) more often."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is the TD (Temporal Difference) error?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "δ = r + γV(s') - V(s)    (TD error)"
    },
    {
     "t": "p",
     "text": "**Interpretation:** Surprise — difference between expected and actual return."
    },
    {
     "t": "ul",
     "items": [
      "δ > 0: outcome better than expected → increase V(s)",
      "δ < 0: outcome worse than expected → decrease V(s)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** TD learning updates value estimates using bootstrapping (current estimate of next state). Faster convergence than Monte Carlo (doesn't wait for episode end)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is A3C (Asynchronous Advantage Actor-Critic)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Multiple parallel agent copies interact with separate environments\nEach agent computes gradients locally\nCentral model aggregated from all agents' gradients"
    },
    {
     "t": "p",
     "text": "**Advantage:** No replay buffer needed (diversity from parallel agents). Faster wall-clock training."
    },
    {
     "t": "p",
     "text": "**Explanation:** Asynchronous training provides diverse experience without replay buffer. Each worker explores different parts of the environment. Superseded by PPO in practice (simpler, similar performance)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is multi-agent reinforcement learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Multiple agents learning simultaneously in shared environment:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Types:\n1. Cooperative: agents work together (team sports)\n2. Competitive: agents oppose each other (chess, Go)\n3. Mixed: both cooperation and competition"
    },
    {
     "t": "p",
     "text": "**Challenges:** Non-stationarity (other agents' policies change), credit assignment, communication."
    },
    {
     "t": "p",
     "text": "**Explanation:** AlphaStar (StarCraft), OpenAI Five (Dota 2). Emergent behaviors: agents develop communication, strategies, deception."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is inverse reinforcement learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn reward function from expert demonstrations:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Given: expert trajectories (state-action sequences)\nLearn: reward function R(s,a) that explains expert behavior\nThen: train agent using learned reward"
    },
    {
     "t": "p",
     "text": "**Explanation:** Specifying rewards is hard. Learning from demonstrations is easier. IRL recovers \"what the expert was optimizing for.\" Used in: autonomous driving (learn from human drivers), robot manipulation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is imitation learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn policy directly from expert demonstrations:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Behavioral cloning: supervised learning, (state → action)\n    L = Σ ||π(sᵢ) - aᵢ*||²\nDAgger: iteratively collect expert corrections\n    Train → deploy → ask expert for corrections → retrain"
    },
    {
     "t": "p",
     "text": "**Problem with BC:** Distribution shift — agent encounters states not in training data."
    },
    {
     "t": "p",
     "text": "**Explanation:** Simpler than RL (no reward needed). But requires expert demonstrations. DAgger addresses distribution shift by iteratively expanding training distribution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is RLHF for language models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Supervised fine-tuning (SFT): train on instruction-response pairs\n2. Reward model training: human rates pairs of responses → train RM\n3. PPO optimization: optimize LM to maximize RM score while staying close to SFT model\n    L = E[RM(response)] - β × KL(π_RL || π_SFT)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Aligns language models with human preferences. ChatGPT, Claude use RLHF. KL penalty prevents reward hacking (generating gibberish that scores high on RM). DPO is a simpler alternative."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is DPO (Direct Preference Optimization)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Simpler alternative to RLHF:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L = -E[log σ(β(log π(y_w|x)/π_ref(y_w|x) - log π(y_l|x)/π_ref(y_l|x)))]\n\ny_w = preferred response, y_l = rejected response\nπ_ref = reference (SFT) model"
    },
    {
     "t": "p",
     "text": "**No reward model needed.** Directly optimize policy from preference data."
    },
    {
     "t": "p",
     "text": "**Explanation:** Avoids: training separate reward model, running PPO (complex, unstable). Same objective as RLHF but solved differently. Simpler implementation. Competitive or better results."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is sim-to-real transfer in RL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train agent in simulation, deploy in real world:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Train: physics simulator (fast, cheap, parallelizable)\nDeploy: real robot/environment\nGap: simulation doesn't perfectly match reality"
    },
    {
     "t": "p",
     "text": "**Solutions:** Domain randomization (vary simulator parameters), system identification, progressive adaptation."
    },
    {
     "t": "p",
     "text": "**Explanation:** Real-world training is: slow, expensive, dangerous (robot can break). Simulation enables millions of episodes. Domain randomization: train on many sim variations → robust to real-world differences."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is curriculum learning in RL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train on progressively harder tasks:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Phase 1: simple environment (fewer obstacles, closer goal)\nPhase 2: moderate difficulty\nPhase 3: full difficulty"
    },
    {
     "t": "p",
     "text": "**Automatic curriculum:** Adjust difficulty based on agent's current performance."
    },
    {
     "t": "p",
     "text": "**Explanation:** Complex tasks may have sparse rewards → impossible to learn from scratch. Easy tasks provide learning signal. Gradual increase maintains learning momentum. OpenAI used this for Rubik's cube solving with robot hand."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is self-play?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Agent trains by playing against itself:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Agent v1 → plays against Agent v1 → Agent v2\nAgent v2 → plays against Agent v2 → Agent v3\n..."
    },
    {
     "t": "p",
     "text": "**Examples:** AlphaGo, AlphaZero, OpenAI Five."
    },
    {
     "t": "p",
     "text": "**Explanation:** No human data needed. Agent discovers novel strategies. Auto-curriculum: opponent difficulty scales with agent's skill. Can discover superhuman strategies. Risk: can converge to niche strategies (solved by population-based training)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is hierarchical reinforcement learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Decompose complex tasks into subtask hierarchy:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "High-level policy: select subtask/goal (navigate to kitchen)\nLow-level policy: execute primitive actions to achieve subtask"
    },
    {
     "t": "p",
     "text": "**Options framework:** Each option = (initiation, policy, termination) tuple."
    },
    {
     "t": "p",
     "text": "**Explanation:** Enables temporal abstraction — plan at different time scales. Kitchen robot: high-level \"make coffee\" → mid-level \"pick up cup, pour water\" → low-level motor commands."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is reward clipping?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Clip rewards to fixed range [-1, 1]:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard: games give 0-1000s points\nClipped: all non-zero rewards → {-1, 0, +1}"
    },
    {
     "t": "p",
     "text": "**Why:** Stabilizes learning across different environments. Prevents one high-reward event from dominating."
    },
    {
     "t": "p",
     "text": "**Trade-off:** Loses reward magnitude information. A 1000-point reward becomes same as 1-point reward."
    },
    {
     "t": "p",
     "text": "**Explanation:** Used in Atari DQN. Alternative: reward normalization (running mean/std)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is the difference between on-policy and off-policy learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**On-policy:** Learn from current policy's experience (PPO, A2C)",
      "**Off-policy:** Learn from ANY experience, including past or other policies (DQN, SAC)"
     ]
    },
    {
     "t": "p",
     "text": "**On-policy:** Can't reuse old data. More stable."
    },
    {
     "t": "p",
     "text": "**Off-policy:** Reuses data (sample efficient). More complex."
    },
    {
     "t": "p",
     "text": "**Explanation:** Off-policy enables experience replay. On-policy discards data after each update (data-hungry). PPO is on-policy but practical due to multiple epochs per data collection."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
