# -*- coding: utf-8 -*-
"""Topic-level audit for every course, not just genai/langchain.

Same idea as heading_audit.py: take every heading in the reference's LEARN
pages and check whether the course names that topic anywhere. Matching is on
content words because the course rewrites every title, so the signal to read
is the `absent=` column -- words that appear in no lesson of that course at
all. The `best=` ratio is noisy and only useful as a tiebreak.

Usage: python -I heading_audit2.py <course> [<course> ...] [--absent-only]
"""
import glob, io, os, re, sys

REPO = r'C:\Users\venuk\Desktop\enterprise-course'
REF = r'C:\Users\venuk\Desktop\CLAUDE LEARNING\tutorial-hub\site'

# course -> list of "<dir>/<page>.html" learn pages. Practice and interview
# pages are deliberately excluded: those tracks were never imported, which is
# a separate decision from a gap in the learn track.
COURSES = {
    'python':    ['01_Python/core.html', '01_Python/advanced.html',
                  '01_Python/internals.html', '01_Python/stdlib.html',
                  '01_Python/web.html'],
    'maths':     ['02_Mathematics_and_Statistics/math.html',
                  '02_Mathematics_and_Statistics/stats.html'],
    'data':      ['03_Data_Handling/features.html', '01_Python/data.html'],
    'ml':        ['04_Machine_Learning/fundamentals.html',
                  '04_Machine_Learning/algorithms-a.html',
                  '04_Machine_Learning/algorithms-b.html',
                  '04_Machine_Learning/sklearn.html',
                  '04_Machine_Learning/special.html',
                  '04_Machine_Learning/time-series.html'],
    'dl':        ['05_Deep_Learning/fundamentals.html',
                  '05_Deep_Learning/architectures.html',
                  '05_Deep_Learning/speech.html'],
    'nlp':       ['06_NLP_and_Transformers/nlp.html',
                  '06_NLP_and_Transformers/transformers.html',
                  '06_NLP_and_Transformers/distance-metrics.html',
                  '06_NLP_and_Transformers/fuzzy-matching.html',
                  '06_NLP_and_Transformers/multimodal.html'],
    'sql':       ['14_SQL/reference.html', '14_SQL/worked.html'],
    'dsa':       ['01_Python/dsa.html'],
    'practice':  ['13_Coding_Practice/basics.html', '13_Coding_Practice/lists.html',
                  '13_Coding_Practice/functions.html', '13_Coding_Practice/oop.html',
                  '13_Coding_Practice/errors-io.html', '13_Coding_Practice/algorithms.html',
                  '13_Coding_Practice/advanced.html', '13_Coding_Practice/backend.html',
                  '13_Coding_Practice/tooling.html', '13_Coding_Practice/question-sets.html'],
    'genai':     ['07_GenAI_and_LLMs/llm.html', '07_GenAI_and_LLMs/rag.html',
                  '07_GenAI_and_LLMs/training.html', '07_GenAI_and_LLMs/inference.html',
                  '07_GenAI_and_LLMs/eval.html', '07_GenAI_and_LLMs/observability.html',
                  '07_GenAI_and_LLMs/production.html'],
    'langchain': ['08_LangChain_and_LangGraph/langchain.html',
                  '08_LangChain_and_LangGraph/langgraph.html',
                  '08_LangChain_and_LangGraph/patterns.html',
                  '08_LangChain_and_LangGraph/production.html',
                  '08_LangChain_and_LangGraph/failure.html',
                  '08_LangChain_and_LangGraph/lenses.html',
                  '08_LangChain_and_LangGraph/reference.html'],
    'adk':       ['09_MCP/adk.html', '09_MCP/reference.html'],
}

HEAD = re.compile(r'<h([23])\b[^>]*>(.*?)</h\1>', re.S | re.I)
TAG = re.compile(r'<[^>]+>')

STOP = set('''a an the and or of to in on for with without by as at from into is are was were be been being
this that these those it its their there here what which who whom whose when where why how do does did done
not no nor but if then than so such can could may might must shall should will would you your we our they
them he she his her i me my us one two three four five six seven eight nine ten first second third
other others more most less least much many few several all any each every some both either neither
also just only even still yet already about above below under over between through during before after
up down out off again further once because while until unless whether though although however therefore
thus hence moreover furthermore nevertheless nonetheless meanwhile otherwise instead rather quite very
really actually basically essentially simply merely truly indeed certainly surely probably possibly
perhaps maybe likely unlikely definitely absolutely completely totally entirely wholly fully partly
using used use uses make makes made making get gets got getting go goes went going come comes came coming
see sees saw seeing know knows knew knowing think thinks thought thinking want wants wanted wanting
need needs needed needing like likes liked liking look looks looked looking give gives gave giving
take takes took taking put puts putting say says said saying tell tells told telling work works worked
working try tries tried trying ask asks asked asking seem seems seemed seeming feel feels felt feeling
leave leaves left leaving call calls called calling vs versus etc eg ie via per
'''.split())


def words(s):
    return [w for w in re.findall(r'[a-z0-9_]+', s.lower()) if w not in STOP and len(w) > 2]


def course_corpus(course):
    out = {}
    pat = os.path.join(REPO, 'courses', course, 'lessons', '**', '*.js')
    for f in glob.glob(pat, recursive=True):
        lid = os.path.basename(f)[:-3]
        src = io.open(f, encoding='utf-8').read()
        out[lid] = set(words(src))          # the whole lesson source, not just titles
    return out


def audit(course, absent_only):
    corpus = course_corpus(course)
    all_words = set().union(*corpus.values()) if corpus else set()

    heads = []
    for rel in COURSES[course]:
        p = os.path.join(REF, rel.replace('/', os.sep))
        if not os.path.exists(p):
            print('  MISSING REFERENCE PAGE', rel)
            continue
        t = io.open(p, encoding='utf-8', errors='replace').read()
        for lvl, raw in HEAD.findall(t):
            txt = TAG.sub('', raw)
            txt = re.sub(r'&[a-z]+;|&#\d+;', ' ', txt)
            txt = ' '.join(txt.split())
            if txt:
                heads.append((os.path.basename(rel)[:-5], lvl, txt))

    flagged = []
    for page, lvl, txt in heads:
        w = set(words(txt))
        if not w:
            continue
        absent = sorted(x for x in w if x not in all_words)
        best = max((len(w & c) for c in corpus.values()), default=0)
        together = best / float(len(w))
        if absent or (not absent_only and together < 0.6):
            flagged.append((page, lvl, txt, absent, round(together, 2)))

    print('=' * 92)
    print('%s: %d headings in %d learn pages, %d flagged (%d with absent words)'
          % (course.upper(), len(heads), len(COURSES[course]), len(flagged),
             sum(1 for f in flagged if f[3])))
    print('=' * 92)
    for page, lvl, txt, absent, tog in flagged:
        line = '%-16s h%s  %-58s  absent=%-34s best=%.2f' % (
            page, lvl, txt[:58], ','.join(absent[:5])[:34], tog)
        print(line.encode('ascii', 'replace').decode())
    print()


absent_only = '--absent-only' in sys.argv
args = [a for a in sys.argv[1:] if not a.startswith('--')]
for c in (args or list(COURSES)):
    audit(c, absent_only)
