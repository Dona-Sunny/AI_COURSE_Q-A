"use client";

import { FormEvent, useState } from "react";
import styles from "./page.module.css";

type AskResponse = {
  question?: string;
  supportLevel?: "none" | "partial" | "strong";
  answer?: string;
  sources?: Array<{
    chunkId: string;
    documentId: string;
    documentTitle: string;
    excerpt: string;
  }>;
  error?: string;
};

const SAMPLE_QUESTIONS = [
  "What is machine learning?",
  "Explain neural networks.",
  "What is deep learning?"
];

export default function Home() {
  const [question, setQuestion] = useState(SAMPLE_QUESTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question })
      });

      const data = (await response.json()) as AskResponse;

      if (!response.ok) {
        setResult(null);
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setResult(data);
    } catch {
      setResult(null);
      setError("Could not reach the API route.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.kicker}>AI Course Notes Q&amp;A</p>
          <h1>Ask grounded questions from your AI course notes.</h1>
          <p className={styles.subtitle}>
            This MVP uses preprocessed notes, deterministic retrieval, and strict
            support routing before answer generation.
          </p>
        </section>

        <section className={styles.panel}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.label} htmlFor="question">
              Ask a course concept question
            </label>
            <textarea
              id="question"
              className={styles.textarea}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              placeholder="What is machine learning?"
            />

            <div className={styles.actions}>
              <button className={styles.primaryButton} disabled={loading} type="submit">
                {loading ? "Asking..." : "Ask Notes"}
              </button>

              <div className={styles.samples}>
                {SAMPLE_QUESTIONS.map((sample) => (
                  <button
                    key={sample}
                    className={styles.sampleButton}
                    onClick={() => setQuestion(sample)}
                    type="button"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </section>

        <section className={styles.responsePanel}>
          {error ? <p className={styles.error}>{error}</p> : null}

          {!error && !result ? (
            <p className={styles.emptyState}>
              Submit a question to see the grounded answer, support level, and source
              excerpts.
            </p>
          ) : null}

          {result ? (
            <div className={styles.responseCard}>
              <div className={styles.responseHeader}>
                <h2>Answer</h2>
                {result.supportLevel ? (
                  <span className={`${styles.badge} ${styles[result.supportLevel]}`}>
                    {result.supportLevel}
                  </span>
                ) : null}
              </div>

              <p className={styles.answer}>{result.answer}</p>

              {result.sources && result.sources.length > 0 ? (
                <div className={styles.sources}>
                  <h3>Sources</h3>
                  <ul className={styles.sourceList}>
                    {result.sources.map((source) => (
                      <li className={styles.sourceItem} key={source.chunkId}>
                        <p className={styles.sourceMeta}>
                          {source.documentTitle} · {source.chunkId}
                        </p>
                        <p className={styles.sourceExcerpt}>{source.excerpt}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
