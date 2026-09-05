/* ============================================================================
   DESIGN PATTERNS 18.3 — Structural Patterns
   ----------------------------------------------------------------------------
   Pattern and SOLID questions, gathered here from the interview sets so the
   subject lives in one place. Coding problems live in Coding Practice.
   ========================================================================= */
EC.receiveLesson({
 "id": "18.3",
 "lede": "**6 interview questions on structural patterns**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 6 questions on structural patterns without prompting",
  "Name the force each pattern resolves, not only its shape",
  "Say when the pattern is the wrong choice",
  "Give the Python-idiomatic form rather than the textbook one"
 ],
 "prerequisites": [
  "4.11",
  "4.12"
 ],
 "blocks": [
  {
   "t": "callout",
   "kind": "note",
   "title": "How to use this set",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Answer out loud before revealing.** An answer you can only recognise is one you cannot give under pressure.",
      "**Name the force the pattern resolves.** \"It decouples things\" is not an answer; \"it stops the conditional growing every time we add a payment provider\" is.",
      "**Be willing to say \"none of them\".** The strongest answer to a pattern question is often a function, a dict, or a generator."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "1",
   "q": "Distinguish the structural Decorator pattern from Python's `@decorator` syntax.",
   "terms": [
    "Answer",
    "Structural Decorator (GoF)",
    "wraps another object",
    "@ decorator",
    "wraps a function/class",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Structural Decorator (GoF):** an object that **wraps another object** with the same interface, adding behavior — and can be stacked.",
      "**`@` decorator:** syntactic sugar for a function that **wraps a function/class**."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Logged:                       # structural — wraps an object\n    def __init__(self, inner): self._inner = inner\n    def predict(self, x):\n        print(\"log\"); return self._inner.predict(x)\n    def __getattr__(self, a): return getattr(self._inner, a)  # delegate rest",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Same underlying idea (wrapping), different granularity — objects vs functions. `__getattr__` keeps the object wrapper transparent."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "How does Adapter differ from Decorator and Proxy?",
   "terms": [
    "Answer",
    "Adapter",
    "interface",
    "Decorator",
    "same interface",
    "behavior"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "All three wrap an object, but with different goals: - **Adapter:** changes the **interface** to match what a client expects. - **Decorator:** keeps the **same interface**, adds **behavior** (and stacks). - **Proxy:** keeps the same interface, **controls access** (lazy load, cache, permissions)."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Adapter = make it fit; Decorator = add to it; Proxy = guard/manage it."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "When would you use a Facade?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "When a subsystem is complex and clients only need a simple, high-level operation. The Facade exposes one method that orchestrates the messy internals."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "MediaFacade().publish(\"video\")   # hides encode → compress → upload",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Facade reduces coupling to a subsystem; it doesn't hide the subsystem (you can still use it directly), it just offers a convenient front door."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Give a real use case for the Proxy pattern.",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Caching and lazy loading are the most common:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class CachingProxy:\n    def __init__(self, db): self.db, self.cache = db, {}\n    def query(self, sql):\n        if sql not in self.cache: self.cache[sql] = self.db.query(sql)\n        return self.cache[sql]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Also: virtual proxies (defer expensive construction until first use), protection proxies (permission checks), and remote proxies (RPC stubs)."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** The proxy shares the target's interface so callers are unaware they're talking to a stand-in."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Explain the Composite pattern with an example.",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "It lets clients treat individual objects (leaves) and groups (composites) uniformly through one interface, naturally fitting trees."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Folder(Node):\n    def size(self): return sum(c.size() for c in self.children)  # recurse",
     "numbered": false
    },
    {
     "t": "p",
     "text": "A `File.size()` returns its own size; a `Folder.size()` recurses over children — but callers just call `.size()` either way."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use it for part-whole hierarchies — file systems, UI trees, org charts."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What problem does the Bridge pattern solve?",
   "terms": [
    "Answer",
    "combinatorial explosion",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "It prevents a **combinatorial explosion** of subclasses when two dimensions vary independently, by composing instead of inheriting."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "Circle(SVGRenderer(), ...)      # shape × renderer, composed\nCircle(CanvasRenderer(), ...)   # no SvgCircle / CanvasCircle / ... classes",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Shapes (abstraction) and renderers (implementation) evolve separately."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Bridge = \"prefer composition over inheritance\" applied to two orthogonal hierarchies."
    }
   ]
  }
 ],
 "takeaways": []
});
