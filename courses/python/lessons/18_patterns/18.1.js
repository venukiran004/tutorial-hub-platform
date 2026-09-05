/* ============================================================================
   DESIGN PATTERNS 18.1 — SOLID and Design Principles
   ----------------------------------------------------------------------------
   Pattern and SOLID questions, gathered here from the interview sets so the
   subject lives in one place. Coding problems live in Coding Practice.
   ========================================================================= */
EC.receiveLesson({
 "id": "18.1",
 "lede": "**5 interview questions on solid and design principles**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 5 questions on solid and design principles without prompting",
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
   "q": "What are design patterns and why do they still matter in Python?",
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
     "text": "Design patterns are named, reusable solutions to recurring design problems. They give teams a shared vocabulary (\"use a Strategy here\") and capture proven structure."
    },
    {
     "t": "p",
     "text": "In Python many GoF patterns collapse into simpler idioms because functions are first-class and the language is dynamic — but the *intent* still matters for architecture and communication."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# \"Strategy\" in Java = an interface + classes.\n# In Python it can be a single function passed in:\ndef run(data, transform):   # transform IS the strategy\n    return [transform(x) for x in data]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Know the intent and the Pythonic shortcut; don't cargo-cult Java-style boilerplate."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "How are GoF patterns simplified by Python's dynamic features?",
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
     "t": "table",
     "head": [
      "Pattern",
      "Pythonic form"
     ],
     "rows": [
      [
       "Strategy / Command",
       "a function, closure, or `functools.partial`"
      ],
      [
       "Iterator",
       "a generator (`yield`)"
      ],
      [
       "Factory",
       "a dict mapping keys → classes"
      ],
      [
       "Singleton",
       "a module (modules are cached singletons)"
      ],
      [
       "Decorator (behavior)",
       "the `@` syntax; (structural) `__getattr__` delegation"
      ],
      [
       "Observer",
       "a list of callbacks"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** First-class functions, generators, dunder methods, and module-level state remove the need for many helper classes."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "How do you decide which pattern (or none) to use?",
   "terms": [
    "Answer",
    "simplest",
    "composition over inheritance",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Start with the **simplest** thing that works — a function, dict, or generator.",
      "Reach for a pattern only when you hit a real force: varying behavior, growing conditionals, tight coupling, or an explosion of subclasses.",
      "Prefer **composition over inheritance** (Strategy/Bridge/DI over deep class trees)."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Patterns are tools, not goals. Over-applying them adds complexity; the best Python code uses the lightest idiom that solves the actual problem."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "(Bonus) What are the SOLID principles in the context of Python OOP?",
   "terms": [
    "one reason to change",
    "extension",
    "modification",
    "abstractions"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** SOLID is a set of five design principles that help write maintainable, extensible OOP code."
    },
    {
     "t": "h4",
     "text": "S — Single Responsibility Principle (SRP)"
    },
    {
     "t": "p",
     "text": "A class should have **one reason to change** — one responsibility."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# BAD: User handles both data AND persistence\nclass User:\n    def __init__(self, name): self.name = name\n    def save_to_db(self): ...       # persistence logic mixed in\n    def send_email(self): ...       # notification logic mixed in\n\n# GOOD: separated responsibilities\nclass User:\n    def __init__(self, name): self.name = name\n\nclass UserRepository:\n    def save(self, user: User): ...\n\nclass EmailService:\n    def send(self, user: User, message: str): ...",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "O — Open/Closed Principle (OCP)"
    },
    {
     "t": "p",
     "text": "Open for **extension**, closed for **modification**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from abc import ABC, abstractmethod\n\nclass Discount(ABC):\n    @abstractmethod\n    def apply(self, price: float) -> float: ...\n\nclass PercentDiscount(Discount):\n    def __init__(self, pct: float): self.pct = pct\n    def apply(self, price): return price * (1 - self.pct)\n\nclass FlatDiscount(Discount):\n    def __init__(self, amount: float): self.amount = amount\n    def apply(self, price): return max(0, price - self.amount)\n\n# Adding a new discount type doesn't modify existing code\nclass BuyOneGetOneFree(Discount):\n    def apply(self, price): return price / 2",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "L — Liskov Substitution Principle (LSP)"
    },
    {
     "t": "p",
     "text": "Subtypes must be substitutable for their base types without breaking correctness."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Bird:\n    def fly(self): return \"flying\"\n\nclass Penguin(Bird):\n    def fly(self): raise NotImplementedError(\"Penguins can't fly\")  # VIOLATES LSP\n\n# Fix: restructure hierarchy\nclass Bird: pass\nclass FlyingBird(Bird):\n    def fly(self): return \"flying\"\nclass Penguin(Bird):\n    def swim(self): return \"swimming\"",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "I — Interface Segregation Principle (ISP)"
    },
    {
     "t": "p",
     "text": "Don't force clients to depend on methods they don't use."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# BAD: one fat interface\nclass Worker(ABC):\n    @abstractmethod\n    def work(self): ...\n    @abstractmethod\n    def eat(self): ...        # robots don't eat!\n\n# GOOD: segregated protocols\nclass Workable(Protocol):\n    def work(self) -> None: ...\n\nclass Eatable(Protocol):\n    def eat(self) -> None: ...\n\nclass Human:\n    def work(self): ...\n    def eat(self): ...\n\nclass Robot:\n    def work(self): ...\n    # No eat() — and that's fine",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "D — Dependency Inversion Principle (DIP)"
    },
    {
     "t": "p",
     "text": "High-level modules should depend on **abstractions**, not concrete implementations."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import Protocol\n\nclass Logger(Protocol):\n    def log(self, message: str) -> None: ...\n\nclass FileLogger:\n    def log(self, message: str):\n        with open(\"app.log\", \"a\") as f:\n            f.write(message + \"\\n\")\n\nclass ConsoleLogger:\n    def log(self, message: str):\n        print(message)\n\nclass App:\n    def __init__(self, logger: Logger):      # depends on abstraction\n        self.logger = logger\n\n    def run(self):\n        self.logger.log(\"App started\")\n\napp = App(ConsoleLogger())    # inject any Logger implementation\napp.run()",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What are the SOLID and DRY/KISS/YAGNI principles?",
   "terms": [
    "Answer",
    "DRY",
    "KISS",
    "YAGNI",
    "SOLID",
    "composition over inheritance"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**DRY**one source of truth; extract repetition.",
      "**KISS**favor simple, readable solutions over clever ones.",
      "**YAGNI**don't build features/abstractions until actually needed.",
      "**SOLID**Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion: keep classes small, extensible, substitutable, and depending on abstractions."
     ]
    },
    {
     "t": "p",
     "text": "Also: **composition over inheritance** — inject behavior rather than building deep class hierarchies."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** These principles keep code decoupled, simple, and maintainable as it grows."
    }
   ]
  }
 ],
 "takeaways": []
});
