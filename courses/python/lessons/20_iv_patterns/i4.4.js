/* ============================================================================
   INTERVIEW: DESIGN PATTERNS & SOLID i4.4 — Behavioural Patterns
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i4.4",
 "lede": "**19 interview questions on behavioural patterns**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 19 questions on behavioural patterns without prompting",
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
   "q": "Implement the Observer pattern. How is it different from Mediator?",
   "terms": [
    "Answer",
    "Observer",
    "Mediator",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Observer = one subject notifies many subscribers via callbacks:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Emitter:\n    def __init__(self): self._subs = {}\n    def on(self, e, cb): self._subs.setdefault(e, []).append(cb)\n    def emit(self, e, *a): [cb(*a) for cb in self._subs.get(e, [])]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Observer:** one-to-many notification; subscribers don't know each other. **Mediator:** a hub that coordinates many-to-many communication between peers, centralizing the interaction logic."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Observer broadcasts state changes; Mediator manages mutual communication between objects."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Why is Strategy almost trivial in Python?",
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
     "text": "Because functions are first-class — the \"strategy interface\" is just *callable*, so you pass a function instead of building a class hierarchy."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "Trainer(loss=mae)   # the strategy is a function\nTrainer(loss=mse)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Use the class-based form only when a strategy needs configuration or state."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Default to passing a function; escalate to classes only for stateful strategies."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Strategy vs Template Method — how do they differ?",
   "terms": [
    "Answer",
    "Strategy (composition)",
    "entire",
    "Template Method (inheritance)",
    "skeleton",
    "steps"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Strategy (composition):** swaps the **entire** algorithm at runtime by injecting an object/function.",
      "**Template Method (inheritance):** fixes the algorithm's **skeleton** in a base method and lets subclasses override individual **steps**."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Pipeline:\n    def run(self):           # template: fixed order\n        self.extract(); self.transform(); self.load()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Strategy varies the whole algorithm via composition; Template Method varies steps within a fixed structure via inheritance."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "How does the Command pattern enable undo/redo?",
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
     "text": "Each command stores everything needed to `execute()` and to reverse via `undo()`. A history stack records executed commands; undo pops and reverses."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Insert(Command):\n    def execute(self): ...    # apply\n    def undo(self): ...       # reverse exactly what execute did",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Encapsulating an action as an object (with its inverse) makes queues, macros, and undo/redo possible. Closures/`partial` are the lightweight version when undo isn't needed."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What's the idiomatic way to implement the Iterator pattern in Python?",
   "terms": [
    "Answer",
    "generator",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A **generator** via `__iter__`:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Batches:\n    def __init__(self, data, n): self.data, self.n = data, n\n    def __iter__(self):\n        for i in range(0, len(self.data), self.n):\n            yield self.data[i:i+self.n]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "For custom traversal that must be resumable mid-stream, implement `__iter__`/`__next__` and raise `StopIteration`."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Generators give you the iterator protocol for free — no manual state machine in most cases."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "Explain the State pattern. How does it beat a big if/elif?",
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
     "text": "Each state is an object that defines behavior and valid transitions; the context delegates to its current state object."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Order:\n    def advance(self): self.state.next(self)   # delegates to state",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Versus `if self.status == \"pending\": ...`, the State pattern localizes each state's rules in one class and makes illegal transitions explicit, avoiding a sprawling conditional that must be edited everywhere."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use State for well-defined lifecycles (orders, connections, parsers) where behavior depends on a changing internal state."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is Chain of Responsibility and where is it used?",
   "terms": [
    "Answer",
    "middleware",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A request travels through a chain of handlers; each either handles it or passes it on."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "auth.set_next(rate_limit).set_next(validate).set_next(business)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "It's the backbone of **middleware** — web frameworks run auth → rate-limit → validation → handler this way."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** It decouples sender from receiver and lets you add/reorder handlers without changing the others."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is the Specification pattern and how do you make it composable in Python?",
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
     "text": "It encapsulates a boolean business rule as an object. Overloading `__and__`, `__or__`, `__invert__` lets rules combine with `&`, `|`, `~`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "cheap_available = PriceBelow(800) & InStock()\n[p for p in products if cheap_available.is_satisfied(p)]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** It turns scattered filter conditions into reusable, named, combinable objects — great for query/filtering logic."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "How do Observer, Pub/Sub, and Mediator relate?",
   "terms": [
    "Answer",
    "Observer",
    "Pub/Sub",
    "Mediator",
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
      "**Observer:** subject directly notifies its registered observers.",
      "**Pub/Sub:** a message broker sits between publishers and subscribers; they're fully decoupled and may not know each other exists.",
      "**Mediator:** a central object coordinates interactions among a set of colleagues."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** All reduce direct coupling, but the indirection grows from Observer (light) → Mediator (central hub) → Pub/Sub (broker, fully decoupled)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Observer / event pattern.",
   "body": [
    {
     "t": "p",
     "text": "**A:** The Observer pattern lets objects (observers/subscribers) register to receive notifications when another object (subject/publisher) changes state. In Python, this is often implemented with callbacks or an event system."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import defaultdict\nfrom typing import Callable\n\nclass EventEmitter:\n    \"\"\"A generic event system (Publisher).\"\"\"\n    def __init__(self):\n        self._listeners: dict[str, list[Callable]] = defaultdict(list)\n\n    def on(self, event: str, callback: Callable):\n        \"\"\"Subscribe to an event.\"\"\"\n        self._listeners[event].append(callback)\n        return self\n\n    def off(self, event: str, callback: Callable):\n        \"\"\"Unsubscribe from an event.\"\"\"\n        self._listeners[event].remove(callback)\n\n    def emit(self, event: str, *args, **kwargs):\n        \"\"\"Notify all subscribers of an event.\"\"\"\n        for callback in self._listeners[event]:\n            callback(*args, **kwargs)\n\n# Usage\nclass StockMarket(EventEmitter):\n    def __init__(self):\n        super().__init__()\n        self._prices = {}\n\n    def update_price(self, symbol: str, price: float):\n        old = self._prices.get(symbol)\n        self._prices[symbol] = price\n        self.emit(\"price_change\", symbol=symbol, price=price, old_price=old)\n\n# Observers (subscribers)\ndef logger(symbol, price, old_price):\n    print(f\"[LOG] {symbol}: ${old_price} → ${price}\")\n\ndef alert(symbol, price, old_price):\n    if price and old_price and price > old_price * 1.05:\n        print(f\"[ALERT] {symbol} jumped more than 5%!\")\n\nmarket = StockMarket()\nmarket.on(\"price_change\", logger)\nmarket.on(\"price_change\", alert)\n\nmarket.update_price(\"AAPL\", 150)\n# [LOG] AAPL: $None → $150\n\nmarket.update_price(\"AAPL\", 160)\n# [LOG] AAPL: $150 → $160\n# [ALERT] AAPL jumped more than 5%!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "This is the foundation of event-driven programming. Frameworks like Django (signals), Flask, and Node.js (EventEmitter) use this pattern extensively."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "Strategy pattern — Pythonic approach.",
   "terms": [
    "first-class functions",
    "Pythonic rule"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** The Strategy pattern lets you swap algorithms at runtime. In classic OOP, you'd use an interface + concrete classes. In Python, **first-class functions** or callables make it much simpler."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Pythonic Strategy with functions\nfrom typing import Callable\n\ndef bubble_sort(data: list) -> list:\n    arr = data[:]\n    for i in range(len(arr)):\n        for j in range(len(arr) - 1 - i):\n            if arr[j] > arr[j + 1]:\n                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n    return arr\n\ndef quick_sort(data: list) -> list:\n    if len(data) <= 1:\n        return data\n    pivot = data[0]\n    left = [x for x in data[1:] if x <= pivot]\n    right = [x for x in data[1:] if x > pivot]\n    return quick_sort(left) + [pivot] + quick_sort(right)\n\nclass Sorter:\n    def __init__(self, strategy: Callable[[list], list] = sorted):\n        self.strategy = strategy\n\n    def sort(self, data: list) -> list:\n        return self.strategy(data)\n\ndata = [5, 2, 8, 1, 9]\nsorter = Sorter(bubble_sort)\nprint(sorter.sort(data))       # [1, 2, 5, 8, 9]\n\nsorter.strategy = quick_sort   # swap strategy at runtime\nprint(sorter.sort(data))       # [1, 2, 5, 8, 9]",
     "numbered": false
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Class-based approach (when strategies need state)\nfrom abc import ABC, abstractmethod\n\nclass PricingStrategy(ABC):\n    @abstractmethod\n    def calculate(self, base_price: float) -> float: ...\n\nclass RegularPricing(PricingStrategy):\n    def calculate(self, base_price):\n        return base_price\n\nclass DiscountPricing(PricingStrategy):\n    def __init__(self, discount: float):\n        self.discount = discount\n\n    def calculate(self, base_price):\n        return base_price * (1 - self.discount)\n\nclass Product:\n    def __init__(self, name: str, price: float, pricing: PricingStrategy):\n        self.name = name\n        self.price = price\n        self.pricing = pricing\n\n    def final_price(self):\n        return self.pricing.calculate(self.price)\n\np = Product(\"Laptop\", 1000, DiscountPricing(0.2))\nprint(p.final_price())   # 800.0",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Pythonic rule:** If the strategy is a simple function, use a callable. If it carries state, use a class."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is the Observer design pattern?",
   "body": [
    {
     "t": "p",
     "text": "Defines a one-to-many dependency: when one object (subject) changes state, all its observers are notified and updated automatically. Used heavily in event systems, GUI frameworks."
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is the Strategy design pattern?",
   "body": [
    {
     "t": "p",
     "text": "Define a family of algorithms, encapsulate each, and make them interchangeable. In Python, often implemented by passing functions/callables:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def sort_by_name(items): return sorted(items, key=lambda x: x.name)\ndef sort_by_price(items): return sorted(items, key=lambda x: x.price)\n\nsorter = sort_by_price  # Swap strategy at runtime",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Functional Programming & Itertools (Q46–Q60)"
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is the Observer pattern in Python?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class EventEmitter:\n    def __init__(self):\n        self._listeners: dict[str, list] = defaultdict(list)\n\n    def on(self, event: str, callback):\n        self._listeners[event].append(callback)\n\n    def emit(self, event: str, *args, **kwargs):\n        for callback in self._listeners[event]:\n            callback(*args, **kwargs)\n\nemitter = EventEmitter()\nemitter.on(\"data\", lambda x: print(f\"Received: {x}\"))\nemitter.emit(\"data\", 42)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is the Strategy pattern in Python?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import Protocol\n\nclass SortStrategy(Protocol):\n    def sort(self, data: list) -> list: ...\n\nclass QuickSort:\n    def sort(self, data): return sorted(data)  # Simplified\n\nclass MergeSort:\n    def sort(self, data): ...\n\nclass Sorter:\n    def __init__(self, strategy: SortStrategy):\n        self.strategy = strategy\n    def sort(self, data):\n        return self.strategy.sort(data)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is the Command pattern in Python?",
   "body": [
    {
     "t": "p",
     "text": "Encapsulate a request as an object, enabling undo/redo:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Command(ABC):\n    @abstractmethod\n    def execute(self): ...\n    @abstractmethod\n    def undo(self): ...\n\nclass InsertTextCommand(Command):\n    def __init__(self, editor, text, position):\n        self.editor, self.text, self.position = editor, text, position\n    def execute(self): self.editor.insert(self.text, self.position)\n    def undo(self): self.editor.delete(self.position, len(self.text))",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is the Interpreter pattern, and when is a small language the right answer?",
   "terms": [
    "Answer",
    "Interpreter",
    "grammar",
    "evaluate",
    "DSL",
    "data not code"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Interpreter models a tiny language as a tree of small objects, each of which knows how to **evaluate itself**. A rule like `(is_complex or is_premium) and not is_rate_limited` stops being Python that only a programmer can change and becomes **data** you can build, store, edit and audit."
    },
    {
     "t": "p",
     "text": "That is the whole motivation. A routing rule hard-coded in a function needs a deploy to change; the same rule as an expression tree can be edited by an operations team, versioned in a database, and shown in a user interface. Feature flags, metadata filters over retrieved chunks and permission expressions are all the same shape."
    },
    {
     "t": "p",
     "text": "The cost is real: you have written a language, so you now own its grammar, its error messages and its security. The reason people reach for `eval()` instead is that it is one line — and the reason that is a mistake is that it executes arbitrary Python from whatever wrote the rule."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** use it when non-programmers must change the rule, or the rule must be stored and audited. For anything else, a function is clearer and free."
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "Explain Memento. What does it give you that saving fields by hand does not?",
   "terms": [
    "Answer",
    "Memento",
    "snapshot",
    "opaque",
    "encapsulation",
    "checkpoint"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Memento takes an **opaque snapshot** of an object's full state so it can be restored later, without exposing the object's internals to whoever holds the snapshot. The analogy is a save file: the caller does not parse it, it just saves and loads."
    },
    {
     "t": "p",
     "text": "The contrast with the hand-rolled version is the point. Stashing `saved_messages, saved_step = sess.messages[:], sess.step` works until somebody adds a third field — and then restore silently produces a half-old, half-new object, which is worse than failing. A snapshot taken by the object itself cannot drift from the object's own shape."
    },
    {
     "t": "p",
     "text": "Modern instances are everywhere: checkpointing agent or graph state so a run can resume or roll back, and snapshotting a conversation before a risky tool call so a failure can be reverted."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** the value is encapsulation, not storage. The object decides what its state is, so restore stays correct as the object grows."
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What does Visitor buy you, and why is it rare in Python?",
   "terms": [
    "Answer",
    "Visitor",
    "double dispatch",
    "accept",
    "singledispatch",
    "fixed types"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Visitor is for a **fixed set of element types with a growing set of operations**. Instead of editing every element class each time you add an operation, each operation becomes one visitor object and elements `accept` it. Adding an operation is adding one file; adding an element type means editing every visitor — which is exactly the trade-off, and why it fits ASTs and compilers."
    },
    {
     "t": "p",
     "text": "A concrete modern case: walking the content blocks of a multimodal message — text, image, tool use — to render them, estimate token cost or validate them. Each new operation is one visitor with no edits to the block classes."
    },
    {
     "t": "p",
     "text": "It is rare in Python because the mechanism it exists to fake, double dispatch, is available more directly. `functools.singledispatch` dispatches on the argument's type, and structural pattern matching (lesson 5.5) destructures a node and branches in a few readable lines. Both express the same idea without the `accept`/`visit` ceremony."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** know the force it resolves — operations changing faster than types — then implement it with `singledispatch` or `match`."
    }
   ]
  }
 ],
 "takeaways": []
});
