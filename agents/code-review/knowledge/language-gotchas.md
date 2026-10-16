# Knowledge — Language Gotchas

Load when the diff's language is known. Report only what actually applies.

## JavaScript / TypeScript
- `==`/`!=` coercion (`"0" == false`); use `===`.
- `NaN` comparisons; `Number()` vs `parseInt` vs `+`; `parseInt` without radix.
- `this` binding in callbacks; arrow vs function in class fields.
- Floating point: `0.1 + 0.2`; money must be integer cents or a decimal library.
- `Array.sort()` default is lexicographic; `sort` mutates.
- `for...in` over arrays/objects, prototype pollution on merge (deep-merge of
  untrusted JSON, `__proto__`/`constructor` keys).
- Async: no `await` in `for` loops with `map`, unhandled rejection, `forEach` with
  async callback, missing `return await` in try/catch.
- `JSON.parse` on untrusted input without schema validation.
- Date pitfalls; `Date` is mutable and timezone-shifty.
- TS: `any`/`as` casts hiding bugs, non-null `!` on possibly-null, missing
  exhaustive switch, structural typing surprises.

## Python
- Mutable default arguments (`def f(x=[])`).
- Late-binding closures in loops.
- `is` vs `==` (and `is` on small ints/strings "working" by luck).
- Broad `except Exception`/bare `except`; swallowed exceptions.
- Mutable class attributes shared across instances.
- Integer division `/` vs `//`; float money.
- `pickle`/`yaml.load` on untrusted data.
- GIL assumptions around threads for CPU work; blocking calls in async.
- f-strings for SQL/shell (injection).
- Naive `datetime` mixing with aware datetimes.

## Go
- Ignored `error` returns; `err` shadowing.
- Loop variable capture in goroutines (pre-1.22); `range` var reuse.
- Goroutine leaks (blocked on channel), missing `defer cancel()` for contexts.
- Nil map writes; appending to nil slice is fine but map isn't.
- `defer` in a loop accumulating until function return.
- Data races on shared maps/slices without a mutex; use `-race`.
- `http.Client` without timeouts; `DefaultClient` reuse issues.
- Integer overflow / conversion truncation; `time.Duration` unit mixups.

## Rust
- Unnecessary `unwrap()`/`expect()` on fallible input (panic/DoS).
- `clone()` in hot paths; holding a lock across `.await`; `Rc`/`RefCell` cycles.
- Integer overflow (panics in debug, wraps in release).
- `unsafe` blocks without justification/documentation.
- Blocking in async context.

## Java / JVM
- `equals`/`hashCode` contract violations; `==` on boxed types.
- Unclosed resources (use try-with-resources); `Stream` laziness surprises.
- `synchronized` granularity; `SimpleDateFormat` not thread-safe.
- Mutable statics; `final` not meaning immutable.
- Deserialization of untrusted data; reflection-driven gadgets.

## SQL
- Implicit type conversions defeating indexes.
- `SELECT *` in production paths; missing pagination on large tables.
- `NOT IN` with NULLs; `LEFT JOIN` + `WHERE` on the right table turning it inner.
- Missing index on join/filter columns used by hot queries.
- Transactions: missing rollback on error; long-held locks; non-repeatable reads.
- `LIMIT` without `ORDER BY` (nondeterministic).
