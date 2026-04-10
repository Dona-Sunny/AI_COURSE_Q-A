export class AnswerGenerationConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "AnswerGenerationConfigError";
    this.code = "ANSWER_GENERATION_CONFIG_ERROR";
  }
}
