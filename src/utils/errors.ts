import { SdkError } from "../types";

export const isSdkError = (error: unknown): error is SdkError =>
  error instanceof SdkError;
