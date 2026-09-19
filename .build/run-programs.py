#!/usr/bin/env python
"""Run every "### Program N" block of a Practice file and capture what it
printed, so the imported lesson can show the output under the code.

Each program runs in its own interpreter with a time limit, from a working
directory that holds the datasets the programs download (so `./data`
resolves and nothing is fetched twice). stdout is saved verbatim; a program
that fails saves the last line of its traceback prefixed with "[did not run]"
so the lesson shows the reason rather than pretending.

Run: python .build/run-programs.py dl   # -> .build/outputs/dl/programs/N.txt
     python .build/run-programs.py ml
"""
import io
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
HUB = os.path.join(os.path.expanduser("~"), "Desktop", "CLAUDE LEARNING", "tutorial-hub")
SRC = {"dl": "05_Deep_Learning/Practice/00_PyTorch_Programs.md",
       "ml": "04_Machine_Learning/Practice/01_Fundamentals.md"}
WORKDIR = os.environ.get("TH_WORKDIR") or os.getcwd()
TIMEOUT = int(os.environ.get("TH_TIMEOUT", "600"))

course = sys.argv[1] if len(sys.argv) > 1 else "dl"
only = set(sys.argv[2:])
out_dir = os.path.join(HERE, "outputs", course, "programs")
os.makedirs(out_dir, exist_ok=True)

lines = io.open(os.path.join(HUB, SRC[course]), encoding="utf-8").read().split("\n")
programs = []
for i, l in enumerate(lines):
    m = re.match(r"^### Program (\d+)[:.]\s*(.*)$", l)
    if not m:
        continue
    j = i + 1
    while j < len(lines) and not lines[j].startswith("```"):
        j += 1
    k = j + 1
    while k < len(lines) and not lines[k].startswith("```"):
        k += 1
    programs.append((m.group(1), m.group(2), "\n".join(lines[j + 1:k])))

NL = chr(10)
env = dict(os.environ, PYTHONIOENCODING="utf-8", OMP_NUM_THREADS="4",
           TF_CPP_MIN_LOG_LEVEL="3", PYTHONWARNINGS="ignore", MPLBACKEND="Agg")
for n, title, code in programs:
    if only and n not in only:
        continue
    target = os.path.join(out_dir, "%s.txt" % n)
    script = os.path.join(out_dir, "_p%s.py" % n)
    # A snippet sheet that assumes torch is already imported gets the import
    # (a second import further down is harmless).
    if "torch." in code and code.find("torch.") < max(code.find("import torch"), 0):
        code = "import torch" + NL + code
    io.open(script, "w", encoding="utf-8", newline=NL).write(code + NL)
    try:
        r = subprocess.run([sys.executable, "-u", script], cwd=WORKDIR, env=env,
                           capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=TIMEOUT)
        out = r.stdout.rstrip()
        if r.returncode != 0:
            err = [x for x in r.stderr.strip().split(NL) if x.strip()]
            last = err[-1] if err else "exit %d" % r.returncode
            out = (out + NL if out else "") + "[did not run to completion] " + last
        status = "ok" if r.returncode == 0 else "FAIL"
    except subprocess.TimeoutExpired as e:
        out = ((e.stdout or "").rstrip() if isinstance(e.stdout, str) else "") + NL + "[stopped after %d s]" % TIMEOUT
        status = "TIMEOUT"
    # strip the framework's own noise so the output is the program's
    out = NL.join(l for l in out.split(NL) if not re.search(r"oneDNN|I0000|W0000|UserWarning|FutureWarning|warnings.warn", l))
    io.open(target, "w", encoding="utf-8", newline=NL).write(out.strip() + NL)
    os.remove(script)
    print("%-8s %3s  %s" % (status, n, title[:70]), flush=True)
