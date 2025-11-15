declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    GEMINI_API_KEY?: string;
    GEMINI_API_BASE_URL?: string;
  }

  interface Process {
    env: ProcessEnv;
  }
}

declare const process: NodeJS.Process;
