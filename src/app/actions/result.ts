import { ForbiddenError, UnauthenticatedError } from "@/lib/guard";

export interface ActionResult {
  error?: string;
}

/**
 * Turns a thrown guard error into a message the interface can show.
 *
 * Anything else is re-thrown rather than swallowed: an unexpected failure that
 * silently renders as "something went wrong" is how data loss goes unnoticed.
 */
export function toActionError(error: unknown): ActionResult {
  if (error instanceof ForbiddenError || error instanceof UnauthenticatedError) {
    return { error: error.message };
  }
  throw error;
}
