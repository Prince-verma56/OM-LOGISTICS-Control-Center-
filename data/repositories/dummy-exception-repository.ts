import { nextExceptionId } from "@/data/seed/exceptions";
import { getDemoStore } from "@/data/store/demo-store";
import type { Exception, ExceptionAuditEntry } from "@/types/exception";
import type { ExceptionRepository } from "./types";

/** Exception + audit-trail repository backed by the in-memory demo store. */
export class DummyExceptionRepository implements ExceptionRepository {
  async list() {
    return [...getDemoStore().exceptions.values()];
  }

  async getById(id: string) {
    return getDemoStore().exceptions.get(id);
  }

  async create(exception: Exception, audit: ExceptionAuditEntry) {
    const store = getDemoStore();
    store.exceptions.set(exception.id, exception);
    store.audit.set(exception.id, [audit]);
    return exception;
  }

  async update(id: string, patch: Partial<Exception>, audit?: ExceptionAuditEntry) {
    const store = getDemoStore();
    const exception = store.exceptions.get(id);
    if (!exception) return undefined;
    Object.assign(exception, patch);
    if (audit) {
      const trail = store.audit.get(id) ?? [];
      trail.push(audit);
      store.audit.set(id, trail);
    }
    return exception;
  }

  async listAudit(exceptionId: string) {
    return [...(getDemoStore().audit.get(exceptionId) ?? [])];
  }

  async nextId() {
    return nextExceptionId(getDemoStore().counters);
  }

  async nextAuditId() {
    const counters = getDemoStore().counters;
    counters.audit += 1;
    return `aud_${counters.audit.toString(36).padStart(5, "0")}`;
  }
}
