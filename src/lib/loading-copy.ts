/**
 * Centralized copy for loading states. Single source of truth — add or change
 * journey keys here when flows evolve.
 */
export const LOADING_COPY = {
  questions: {
    main: "Generating questions…",
    subline:
      "Reading your meeting context and drafting three tailored questions. Usually 5–15 seconds.",
  },
  brief: {
    main: "Generating your Frame Brief…",
    subline:
      "Turning your answers into a one-page brief with real goal, constraints, and agenda. Usually 10–30 seconds.",
  },
  overlay: {
    main: "Analysing responses…",
    subline:
      "Comparing what you said with what your audience heard and drafting a short summary. Usually 10–20 seconds.",
  },
} as const;

export type LoadingCopyKey = keyof typeof LOADING_COPY;
