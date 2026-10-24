/* ============================================================================
   INTERVIEW EXPERIENCE — CURRICULUM
   ----------------------------------------------------------------------------
   Real interview question sets, answered. One page per experience.

   Within a page the questions are grouped by theme rather than kept in the
   order they were asked, so the related ones sit together and the follow-ups
   are next to what they followed up on. The answers are written as what a
   strong answer contains, not as a script: these interviewers checked whether
   the candidate had actually built the thing, so a recited answer is worse
   than a shorter honest one.

   Questions about a candidate's own project are left out, because the answer
   is theirs. What is kept is everything that transfers: the mechanism, the
   trade-off and the number.

   Where a claim can be measured it was measured, on Python 3.11.
   ========================================================================= */
(function () {
  "use strict";

  EC.defineCourse({
    id: "interview",
    title: "Interview Experience",
    subtitle: "Real question sets, answered properly",
    short: "IV",
    tagline: "Actual questions from GenAI and agentic-systems interviews, one page per experience, answered with the mechanism, the trade-off and the number — because every one of these interviewers checked whether you had built it.",

    blurb: "Question sets from real interviews, answered. RAG and agentic RAG, reranking and the cross-encoder trade, evaluating and debugging an agentic system, the KV cache and sampling parameters, production recovery and observability, chunking and PDF extraction, classification metrics on imbalanced data, LangChain against LangGraph, guardrails and RBAC and OAuth, and the coding rounds. Project-specific questions are left out; everything that transfers is kept.",

    published: ["1.1", "1.2"],

    modules: [

      /* ================================================================
         THE EXPERIENCES
         ================================================================ */
      {
        id: "experiences",
        short: "IV",
        dir: "01_experiences",
        phase: "Interview experiences",
        title: "The Experiences",
        blurb: "One page per interview. Each page covers every question from that interview that transfers to anybody — the mechanisms, the trade-offs and the numbers — grouped by theme, with the follow-ups that were actually asked kept beside the question that prompted them.",
        outcome: "You can answer each question with a mechanism rather than a definition, give the number where there is one, and name the trade-off you accepted.",
        lessons: [
          { id: "1.1", title: "Experience 1 — Senior GenAI and Agentic Systems", difficulty: "advanced", minutes: 48, tier: "must",
            summary: "A long technical round and a production round. RAG against agentic RAG, reranking and reranking without a cross-encoder, advanced RAG and large-corpus latency, images and tables, evaluating an agentic system and debugging a drop to 60%, the KV cache and sampling, production recovery and observability, fifty thousand documents and the GIL, guardrails and RBAC and OAuth, and the trapping-rain-water coding question.",
            keywords: ["agentic rag", "reranking", "cross-encoder", "kv cache", "top_p", "catastrophic forgetting", "observability", "opentelemetry", "guardrails", "rbac", "oauth", "gil", "trapping rain water"] },
          { id: "1.2", title: "Experience 2 — GenAI Engineer, Two Technical Rounds", difficulty: "core", minutes: 42, tier: "must",
            summary: "Fundamentals asked properly. What RAG is and why it helps, chunking strategies and how to choose, PDFs with text and images and unstructured extraction, improving retrieval accuracy, prompt engineering, precision and recall and F1 on an imbalanced set, agents against traditional LLM applications, slowly changing dimensions and duplicate removal, the components of a production-ready GenAI application, LangChain against LangGraph, and two warm-up coding questions.",
            keywords: ["rag", "chunking", "pdf extraction", "retrieval accuracy", "prompt engineering", "imbalanced data", "precision recall f1", "ai agents", "scd", "deduplication", "langchain", "langgraph"] }
        ]
      }
    ]
  });
})();
