/* ============================================================================
   INTERVIEW: DESIGN PATTERNS & SOLID i4.3 — Structural Patterns
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i4.3",
 "lede": "**8 interview questions on structural patterns**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 8 questions on structural patterns without prompting",
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
  },
  {
   "t": "drill",
   "n": "7",
   "q": "Proxy / decorator structural pattern",
   "terms": [
    "Proxy",
    "Decorator",
    "Generic proxy using __getattr__"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** The **Proxy** pattern wraps an object to control access (logging, caching, access control, lazy loading). The **Decorator** structural pattern (not Python's `@decorator` syntax) dynamically adds behaviour to an object."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Proxy pattern — lazy loading + access logging\nclass HeavyDatabase:\n    def __init__(self):\n        import time\n        time.sleep(0.1)        # simulate expensive initialisation\n        self.data = {\"users\": 100}\n        print(\"Database loaded!\")\n\n    def query(self, sql: str):\n        return f\"Result for: {sql}\"\n\nclass DatabaseProxy:\n    def __init__(self):\n        self._db = None         # lazy — not created yet\n\n    def _ensure_loaded(self):\n        if self._db is None:\n            self._db = HeavyDatabase()\n\n    def query(self, sql: str):\n        self._ensure_loaded()   # load on first use\n        print(f\"[LOG] Query: {sql}\")\n        return self._db.query(sql)\n\ndb = DatabaseProxy()            # instant — no heavy loading\nprint(db.query(\"SELECT *\"))     # triggers loading + logs",
     "numbered": false
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Decorator structural pattern — adding behaviour dynamically\nclass Notifier:\n    def send(self, message: str):\n        print(f\"Basic notification: {message}\")\n\nclass SMSDecorator:\n    def __init__(self, wrapped: Notifier):\n        self._wrapped = wrapped\n\n    def send(self, message: str):\n        self._wrapped.send(message)         # delegate to original\n        print(f\"SMS notification: {message}\")  # add behaviour\n\nclass SlackDecorator:\n    def __init__(self, wrapped):\n        self._wrapped = wrapped\n\n    def send(self, message: str):\n        self._wrapped.send(message)\n        print(f\"Slack notification: {message}\")\n\n# Stack decorators:\nnotifier = SlackDecorator(SMSDecorator(Notifier()))\nnotifier.send(\"Server down!\")\n# Basic notification: Server down!\n# SMS notification: Server down!\n# Slack notification: Server down!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Generic proxy using `__getattr__`:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class LoggingProxy:\n    def __init__(self, target):\n        self._target = target\n\n    def __getattr__(self, name):\n        attr = getattr(self._target, name)\n        if callable(attr):\n            def wrapper(*args, **kwargs):\n                print(f\"Calling {name}({args}, {kwargs})\")\n                return attr(*args, **kwargs)\n            return wrapper\n        return attr\n\nproxied_list = LoggingProxy([1, 2, 3])\nproxied_list.append(4)    # Calling append((4,), {})",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What problem does Flyweight solve, and what is the Python-idiomatic form?",
   "terms": [
    "Answer",
    "Flyweight",
    "intrinsic",
    "extrinsic",
    "interning",
    "lru_cache"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "When thousands of objects each carry the same heavy, unchanging data, Flyweight stores that data **once** and lets every object point at the shared copy. The vocabulary is the useful part: the shared, immutable part is the **intrinsic** state and the small per-object difference is the **extrinsic** state, passed in at call time rather than stored."
    },
    {
     "t": "p",
     "text": "The classic example is a print shop reusing one metal stamp for every letter 'a' rather than carving a new one. The modern one is sharing a single tokenizer, embedding table or long system prompt across thousands of request objects, where only the user's message differs."
    },
    {
     "t": "p",
     "text": "In Python you rarely write the GoF class. You reach for `functools.lru_cache` on a factory, a module-level constant, or `sys.intern` for strings — and because Python strings and small integers are already interned, you have been using the pattern without naming it."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Flyweight is a memory optimisation, not a design principle. Reach for it when a profiler says identical objects dominate the heap (lesson 10.3), never before."
    }
   ]
  }
 ],
 "takeaways": []
});
