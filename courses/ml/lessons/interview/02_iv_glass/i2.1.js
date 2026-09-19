/* ============================================================================
   INTERVIEW I2.1 — SQL & Database · Probability & Statistics · Coding & Algorithms
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/02_Glassdoor_DS_and_MLE.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.1",
 "lede": "**9 questions** from Glassdoor Data Scientist and ML Engineer. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each question as you would in the interview, then compare against the reference answer",
  "Lead with the definition and the formula, then the trade-off",
  "Follow up on your own answer with the question an interviewer would ask next",
  "Note which questions you could not answer and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "SQL & Database · Probability & Statistics · Coding & Algorithms",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "1",
   "q": "Page Recommendation Query (Meta â€” Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** You have a `friends` table and a `page_likes` table. Write a SQL query to recommend pages to a user based on what their friends like, but exclude pages the user already likes."
    },
    {
     "t": "p",
     "text": "**Schema:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "-- friends(user_id, friend_id)\n-- page_likes(user_id, page_id)"
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT DISTINCT pl.page_id AS recommended_page\nFROM friends f\nJOIN page_likes pl ON f.friend_id = pl.user_id\nWHERE f.user_id = 123\n  AND pl.page_id NOT IN (\n      SELECT page_id\n      FROM page_likes\n      WHERE user_id = 123\n  )\nORDER BY recommended_page;"
    },
    {
     "t": "p",
     "text": "**With ranking by number of friends who liked:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT pl.page_id,\n       COUNT(DISTINCT f.friend_id) AS friend_count\nFROM friends f\nJOIN page_likes pl ON f.friend_id = pl.user_id\nWHERE f.user_id = 123\n  AND pl.page_id NOT IN (\n      SELECT page_id FROM page_likes WHERE user_id = 123\n  )\nGROUP BY pl.page_id\nORDER BY friend_count DESC;"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Anti-join pattern (`NOT IN` or `LEFT JOIN ... WHERE IS NULL`) is critical for \"recommend what user doesn't have\" problems. Always consider bidirectional friendships."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "SQL Frequency Table with JOINs (Meta â€” Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Create a frequency table using JOINs, GROUP BY, ORDER BY, handling NULLs properly."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "-- Frequency of user activity levels\nSELECT\n    COALESCE(activity_level, 'Unknown') AS activity_level,\n    COUNT(*) AS user_count,\n    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) AS percentage\nFROM users u\nLEFT JOIN user_activities ua ON u.user_id = ua.user_id\nGROUP BY COALESCE(activity_level, 'Unknown')\nORDER BY user_count DESC;"
    },
    {
     "t": "p",
     "text": "**Handling NULLs â€” Critical patterns:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "-- COALESCE for default values\nSELECT COALESCE(column, 'default_value')\n\n-- NULLIF to prevent division by zero\nSELECT revenue / NULLIF(cost, 0)\n\n-- IS NULL vs = NULL (= NULL never works!)\nWHERE column IS NULL  -- âœ… Correct\nWHERE column = NULL   -- âŒ Always false"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Friend Request Acceptance Rate (Meta â€” Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Given tables `friend_requests(sender_id, receiver_id, date)` and `request_accepted(requester_id, accepter_id, date)`, find the overall acceptance rate."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT\n    ROUND(\n        COUNT(DISTINCT CONCAT(ra.requester_id, '-', ra.accepter_id)) * 1.0 /\n        NULLIF(COUNT(DISTINCT CONCAT(fr.sender_id, '-', fr.receiver_id)), 0),\n        4\n    ) AS acceptance_rate\nFROM friend_requests fr\nLEFT JOIN request_accepted ra\n    ON fr.sender_id = ra.requester_id\n    AND fr.receiver_id = ra.accepter_id;"
    },
    {
     "t": "p",
     "text": "**Acceptance rate by date:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT\n    fr.date AS request_date,\n    COUNT(DISTINCT CASE\n        WHEN ra.accepter_id IS NOT NULL\n        THEN CONCAT(fr.sender_id, '-', fr.receiver_id)\n    END) * 1.0 / COUNT(DISTINCT CONCAT(fr.sender_id, '-', fr.receiver_id)) AS daily_rate\nFROM friend_requests fr\nLEFT JOIN request_accepted ra\n    ON fr.sender_id = ra.requester_id\n    AND fr.receiver_id = ra.accepter_id\nGROUP BY fr.date\nORDER BY fr.date;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Cumulative Song Count with INSERT/UPDATE Logic (Meta â€” Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Write a SQL query for cumulative song plays count. Consider INSERT/UPDATE scenarios for tracking."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "-- Cumulative plays over time\nSELECT\n    song_id,\n    play_date,\n    play_count,\n    SUM(play_count) OVER (\n        PARTITION BY song_id\n        ORDER BY play_date\n        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n    ) AS cumulative_plays\nFROM song_plays\nORDER BY song_id, play_date;"
    },
    {
     "t": "p",
     "text": "**UPSERT pattern for tracking:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "-- PostgreSQL UPSERT\nINSERT INTO song_stats (song_id, total_plays, last_played)\nVALUES (101, 1, NOW())\nON CONFLICT (song_id)\nDO UPDATE SET\n    total_plays = song_stats.total_plays + 1,\n    last_played = NOW();\n\n-- MySQL equivalent\nINSERT INTO song_stats (song_id, total_plays, last_played)\nVALUES (101, 1, NOW())\nON DUPLICATE KEY UPDATE\n    total_plays = total_plays + 1,\n    last_played = NOW();"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Umbrella Problem â€” Bayesian Reasoning (Meta â€” Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Three friends each independently lie with probability 1/3. All three say it's raining. What is the probability that it's actually raining?"
    },
    {
     "t": "p",
     "text": "**Solution using Bayes' Theorem:**"
    },
    {
     "t": "p",
     "text": "Let R = actually raining, R' = not raining."
    },
    {
     "t": "p",
     "text": "**Given:**"
    },
    {
     "t": "ul",
     "items": [
      "P(lie) = 1/3, P(truth) = 2/3",
      "Assume P(R) = P(R') = 1/2 (prior, uniform)"
     ]
    },
    {
     "t": "p",
     "text": "**P(all say raining | R) â€” actually raining, all tell truth:**"
    },
    {
     "t": "math",
     "tex": "P(\\text{all say rain} | R) = \\left(\\frac{2}{3}\\right)^3 = \\frac{8}{27}"
    },
    {
     "t": "p",
     "text": "**P(all say raining | R') â€” not raining, all lie:**"
    },
    {
     "t": "math",
     "tex": "P(\\text{all say rain} | R') = \\left(\\frac{1}{3}\\right)^3 = \\frac{1}{27}"
    },
    {
     "t": "p",
     "text": "**Bayes' Theorem:**"
    },
    {
     "t": "math",
     "tex": "P(R | \\text{all say rain}) = \\frac{P(\\text{all say rain} | R) \\cdot P(R)}{P(\\text{all say rain})}"
    },
    {
     "t": "math",
     "tex": "= \\frac{\\frac{8}{27} \\cdot \\frac{1}{2}}{\\frac{8}{27} \\cdot \\frac{1}{2} + \\frac{1}{27} \\cdot \\frac{1}{2}}"
    },
    {
     "t": "math",
     "tex": "= \\frac{\\frac{8}{54}}{\\frac{8}{54} + \\frac{1}{54}} = \\frac{8}{9} \\approx 0.889"
    },
    {
     "t": "p",
     "text": "**Answer: P(actually raining) = 8/9 â‰ˆ 88.9%**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Verification via simulation\nimport random\n\ndef simulate(n_trials=1000000):\n    rain_given_all_say = 0\n    all_say_rain = 0\n\n    for _ in range(n_trials):\n        raining = random.random() < 0.5\n\n        # Each friend says rain if (raining AND truth) or (not raining AND lie)\n        says_rain = []\n        for _ in range(3):\n            lies = random.random() < 1/3\n            if raining:\n                says_rain.append(not lies)  # Truth = says rain\n            else:\n                says_rain.append(lies)       # Lie = says rain\n\n        if all(says_rain):\n            all_say_rain += 1\n            if raining:\n                rain_given_all_say += 1\n\n    return rain_given_all_say / all_say_rain\n\nprint(f\"P(rain | all say rain) = {simulate():.4f}\")  # â‰ˆ 0.8889"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "Ad Serving Probability (Meta â€” Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Compare two ad serving strategies:"
    },
    {
     "t": "ul",
     "items": [
      "**Deterministic:** Show exactly 1 ad per 25 page views (every 25th view)",
      "**Probabilistic:** Each page view has a 4% chance of showing an ad"
     ]
    },
    {
     "t": "p",
     "text": "For 100 page views, calculate:"
    },
    {
     "t": "ol",
     "items": [
      "Expected number of ads for each strategy",
      "P(exactly 1 ad in first 25 views) for probabilistic",
      "P(0 ads in 100 views) for probabilistic"
     ]
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "p",
     "text": "**Expected ads in 100 views:**"
    },
    {
     "t": "ul",
     "items": [
      "Deterministic: exactly 4 ads (100/25)",
      "Probabilistic: E[X] = n Ã— p = 100 Ã— 0.04 = 4 ads"
     ]
    },
    {
     "t": "p",
     "text": "**P(exactly 1 ad in first 25 views) â€” Binomial:**"
    },
    {
     "t": "math",
     "tex": "P(X=1) = \\binom{25}{1} (0.04)^1 (0.96)^{24}"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from scipy.stats import binom\n\n# P(exactly 1 ad in 25 views)\np_one = binom.pmf(1, n=25, p=0.04)\nprint(f\"P(X=1) = {p_one:.4f}\")  # â‰ˆ 0.3754\n\n# P(0 ads in 100 views)\np_zero = binom.pmf(0, n=100, p=0.04)\nprint(f\"P(X=0) = {p_zero:.4f}\")  # â‰ˆ 0.0169\n\n# Or using Poisson approximation (Î» = np = 4)\nfrom scipy.stats import poisson\np_zero_poisson = poisson.pmf(0, mu=4)\nprint(f\"Poisson P(X=0) = {p_zero_poisson:.4f}\")  # â‰ˆ 0.0183"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Deterministic is predictable (exact placement), probabilistic is flexible but has variance. The probabilistic approach can show 0 ads or cluster multiple ads â€” important for user experience design."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "Stone Game Probability with Dice (Meta â€” Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Two players A and B play a game with stones and dice. Calculate P(B wins in n rounds)."
    },
    {
     "t": "p",
     "text": "**Solution Framework:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# General game theory probability\ndef stone_game_probability(n_rounds, p_a_wins_round=0.5):\n    \"\"\"\n    Calculate P(B wins) over n rounds.\n    Assumes each round is independent.\n    \"\"\"\n    from scipy.stats import binom\n\n    # B wins if B wins more than n/2 rounds\n    p_b = 1 - p_a_wins_round\n    b_wins_prob = 0\n\n    for k in range(n_rounds // 2 + 1, n_rounds + 1):\n        b_wins_prob += binom.pmf(k, n_rounds, p_b)\n\n    return b_wins_prob\n\n# With fair dice (each player rolls, higher wins)\n# P(A > B) = P(B > A) = 15/36, P(tie) = 6/36\n# In non-tie rounds: P(A wins | no tie) = P(B wins | no tie) = 0.5"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Find Removed Element from List (Meta â€” Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Given list A and list B (where B = A with one element removed), find the removed element."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Method 1: Sum difference â€” O(n) time, O(1) space\ndef find_removed_sum(a, b):\n    return sum(a) - sum(b)\n\n# Method 2: XOR â€” handles integer overflow better\ndef find_removed_xor(a, b):\n    result = 0\n    for num in a:\n        result ^= num\n    for num in b:\n        result ^= num\n    return result\n\n# Method 3: Counter difference â€” works with non-numeric types\nfrom collections import Counter\ndef find_removed_counter(a, b):\n    diff = Counter(a) - Counter(b)\n    return list(diff.elements())[0]\n\n# Method 4: Sorting â€” O(n log n)\ndef find_removed_sort(a, b):\n    a.sort()\n    b.sort()\n    for x, y in zip(a, b):\n        if x != y:\n            return x\n    return a[-1]\n\n# Test\na = [3, 1, 4, 1, 5, 9]\nb = [3, 1, 4, 5, 9]\nprint(find_removed_xor(a, b))  # 1"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "Second Largest Element in BST (LinkedIn â€” Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Find the second largest element in a Binary Search Tree."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef second_largest_bst(root):\n    \"\"\"\n    The largest is the rightmost node.\n    The second largest is either:\n    1. Parent of the rightmost node (if rightmost has no left subtree)\n    2. Rightmost node of the left subtree of the largest\n    \"\"\"\n    if not root:\n        return None\n\n    current = root\n    parent = None\n\n    # Find the largest (rightmost) node\n    while current.right:\n        parent = current\n        current = current.right\n\n    # Case 1: Largest node has a left subtree\n    # â†’ Second largest is the rightmost of that left subtree\n    if current.left:\n        node = current.left\n        while node.right:\n            node = node.right\n        return node.val\n\n    # Case 2: Largest node has no left subtree\n    # â†’ Second largest is its parent\n    return parent.val if parent else None\n\n# Alternative: In-order traversal (reverse)\ndef second_largest_inorder(root):\n    stack = []\n    count = 0\n    current = root\n\n    while stack or current:\n        while current:\n            stack.append(current)\n            current = current.right  # Reverse in-order\n\n        current = stack.pop()\n        count += 1\n        if count == 2:\n            return current.val\n        current = current.left\n\n    return None"
    },
    {
     "t": "p",
     "text": "**Time Complexity:** O(h) where h = height of BST. O(log n) for balanced BST."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
