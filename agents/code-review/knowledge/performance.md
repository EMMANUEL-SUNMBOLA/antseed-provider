# Knowledge — Performance Review

Load for performance-focused reviews or when the change touches hot paths,
data access, or loops over large collections.

## Algorithmic
- Accidental O(n²): nested loops over the same collection, `list.contains` /
  `array.includes` inside a loop, repeated `len()` on generators.
- Sorting/searching where a hash set/map would do.
- Recomputing invariants inside loops; moving work out of the loop.
- String building with `+=` in a loop (use a builder/join).

## Data access
- **N+1 queries**: a query per item inside a loop where a join or `IN` batch
  works. Look for ORM lazy-loading in loops.
- Missing pagination / fetching full tables; `SELECT *` when a few columns suffice.
- Missing indexes on filter/join columns; functions on indexed columns in WHERE.
- Chatty round-trips; missing batching; chatty microservice calls in a loop.
- Cache: no cache where reads dominate; cache without TTL/eviction; cache
  keyed on high-cardinality input (memory blowup).

## Runtime / concurrency
- Blocking I/O on an event loop (sync fs/network in Node, blocking in async Python,
  blocking in Rust/Go async contexts).
- Serial work that could be parallel; unbounded parallelism causing thrash.
- Excessive locking / contention; lock held across I/O or `await`.
- Reactivating work that should be streamed; loading whole file/response into memory.

## Memory & allocations
- Allocating in hot loops; building huge intermediate arrays/objects.
- Retaining references (closures, listeners, caches) that prevent GC.
- Copying large buffers unnecessarily; cloning deep structures in hot paths.

## Network & payload
- Over-large responses; missing compression; uncompressed images/assets.
- Missing timeouts, connection reuse, or retries-with-backoff.
- Synchronous calls chained when they could be concurrent.

## Reporting
Give the complexity or cost before/after where you can (e.g. "O(n²) → O(n) with a
Set"), name the hot path, and note when you're guessing without profiling data.
Never claim a measured speedup you didn't measure.
