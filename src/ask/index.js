export async function routeQuestion({ retrievalResult, generateAnswer }) {
  const { question, supportLevel, results } = retrievalResult;
  const sources = results.map((result) => ({
    chunkId: result.chunkId,
    documentId: result.documentId,
    documentTitle: result.documentTitle,
    excerpt: result.text
  }));

  if (supportLevel === "none") {
    return {
      question,
      supportLevel,
      answer:
        "I could not find enough relevant information in the course notes to answer that confidently.",
      sources
    };
  }

  const context = results.map((result) => result.text);
  const generated = await generateAnswer(context, question, { supportLevel });
  const answer =
    supportLevel === "partial"
      ? `${generated}\n\nNote: This answer is based only on the available course notes and may be incomplete.`
      : generated;

  return {
    question,
    supportLevel,
    answer,
    sources
  };
}
