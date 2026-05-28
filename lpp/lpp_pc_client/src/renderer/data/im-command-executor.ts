import type { ImCoreCommand } from "./im-read-model";
import { coalesceImCoreCommands } from "./im-read-model";

export type ExecutableImCommand = ImCoreCommand;
export type MarkReadExecutableCommand = Extract<
  ExecutableImCommand,
  { type: "mark_read" | "retry_pending_read" }
>;

export function coalesceExecutableCommands(
  commands: ExecutableImCommand[],
): ExecutableImCommand[] {
  return coalesceImCoreCommands(commands);
}

export function markReadEndpointType(command: MarkReadExecutableCommand) {
  return command.conversationType === "group" ? "group" : "direct";
}
