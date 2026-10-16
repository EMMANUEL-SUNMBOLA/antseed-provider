# Knowledge — Review Checklist

Use this to structure a general or multi-file review.

## Correctness
- Off-by-one errors in loops, slicing, pagination, and range checks.
- Null/undefined/None handling: unchecked results, optional chaining that hides
  failures, default values that mask missing data.
- Boundary conditions: empty input, single element, maximum size, zero/negative
  numbers, unicode, very long strings.
- Type coercion bugs (`==` in JS, implicit numeric conversions, timezone-naive
  datetimes, float equality).
- State mutations aliasing shared objects; sorting/reversing in place when the
  caller didn't expect it.
- Async correctness: unawaited promises, missing error propagation, race
  conditions, `Promise.all` where failures should short-circuit, leaked
  timers/subscriptions.

## Error handling
- Swallowed exceptions (empty `catch`, `except: pass`, ignored error returns).
- Catching too broadly and continuing in a corrupt state.
- Errors surfaced to users that leak internals (stack traces, SQL, file paths).
- Retries without backoff/jitter/idempotency; retrying non-idempotent writes.
- Missing timeouts on network/DB/HTTP calls.

## Resource management
- Unclosed file handles, sockets, DB connections, cursors, streams.
- Unbounded growth: caches without eviction, in-memory maps keyed by user input,
  queues without backpressure.
- Lock ordering / deadlock potential; lock held across I/O.

## Tests
- New logic paths with no test; tests that assert nothing; tests that only test
  the mock.
- Missing edge cases that the code explicitly handles (if it handles them, test
  them).

## Maintainability (report briefly, don't nitpick to fill space)
- Dead code, unused params/imports, commented-out blocks left behind.
- Duplication that will drift out of sync.
- Misleading names; functions doing several unrelated things.
- Magic numbers without a named constant when the value matters.

## Compatibility & API
- Breaking changes to public functions, endpoints, schemas, or CLI flags.
- Missing migration/backfill for schema or data-format changes.
- Serialization changes (field renames, type changes) without versioning.
