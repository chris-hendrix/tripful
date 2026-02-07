export interface Logger {
  info(msg: string): void;
  info(obj: Record<string, unknown>, msg: string): void;
  error(msg: string): void;
  error(obj: unknown, msg: string): void;
}
