# AGENTS.md

## Mission

This codebase exists to make me **hire-obvious in Production Autonomy Governance** through a **reliability lab**.

The lab must produce public, inspectable proof of this chain:

**failure modes → invariants → containment primitives → postmortems**

The goal is not to build a generic app, polished demo, or aesthetic portfolio.
The goal is to show credible usefulness in:

- agent reliability
- production safety
- containment of side effects
- observable execution
- failure-oriented systems thinking
- defensive infrastructure

Every change must strengthen that proof.

---

## Primary Output Standard

Agents working in this repo must optimize for:

1. **Executable proof over narrative**
2. **Public artifacts over private notes**
3. **Failure reproduction over feature building**
4. **Containment primitives over convenience abstractions**
5. **Regression-proof tests over one-off demos**
6. **Observable state over hidden behavior**

Preferred artifacts:

- failure-mode reproductions
- invariant docs
- containment mechanisms
- replayable scenarios
- audit trails
- recovery logic
- postmortems
- minimal reproducible experiments

Avoid:

- generic product features
- UI work unless it exposes reliability evidence
- speculative architecture
- trend-chasing
- prompt collections
- “smart” behavior without inspectability

---

## Repo Identity

This is a **reliability lab**, not a product.

That means:

- We intentionally build unsafe baselines first when needed.
- We make failures reproducible before fixing them.
- We define correctness explicitly as invariants.
- We prefer narrow mechanisms that prove a point.
- We preserve inspectable state so tests and postmortems can explain what happened.

---

## Non-Negotiable Questions

Every task, PR, file, or feature must answer:

1. **What breaks?**
2. **Under what conditions?**
3. **Why does it matter?**
4. **Why do agents/autonomous workflows amplify it?**
5. **What invariant is violated?**
6. **How is it detected?**
7. **What containment or recovery mechanism prevents recurrence?**
8. **What artifact proves this?**

If these questions cannot be answered, the work is not ready.

---

## Definition of Good Work

Good work in this repo has all of the following properties:

- narrow
- testable
- durable
- inspectable
- reproducible
- failure-anchored
- relevant to autonomy governance or reliability engineering

Examples of good work:

- a test that reproduces duplicate side effects after lease expiry
- a SQLite-backed append-only effect ledger
- an idempotent commit boundary
- a reconciler for committed-but-not-finalized jobs
- a postmortem mapping the incident to agent tool retries

Examples of bad work:

- a new abstraction without a motivating failure
- UI polish that does not expose state or evidence
- a framework migration with no reliability gain
- broad “agent platform” plans
- refactors that reduce clarity of failure mechanics

---

## Work Sequence

Agents must follow this order whenever possible:

1. **Failure**
   - identify the failure mode
   - name it
   - define trigger and impact

2. **Invariant**
   - state the correctness property in explicit, testable language

3. **Reproduction**
   - create the minimal scenario that demonstrates the failure

4. **Containment**
   - implement the smallest mechanism that prevents or bounds the failure

5. **Recovery**
   - handle crash, retry, timeout, and partial-progress states

6. **Observability**
   - ensure the system leaves durable evidence of what happened

7. **Postmortem**
   - explain the failure, the fix, and the agent relevance

Do not skip reproduction and jump directly to a fix unless explicitly instructed.

---

## Invariants Policy

Invariants are first-class objects in this repo.

Rules:

- Every important mechanism must trace back to one or more documented invariants.
- Invariants must be concrete and falsifiable.
- “Reliable,” “safe,” and “robust” are not invariants.
- Good invariants describe state or effect constraints.

Examples:

- A job may be retried, but its logical effect may commit at most once.
- Durable commit must precede finalization.
- Recovery must not create new side effects.
- Every effect must be attributable to a job and time.
- Expired leases may cause re-execution attempts, but not duplicate logical outcomes.

When writing code, name the invariant in comments, test names, or docs where helpful.

---

## Failure-Mode Policy

Failure modes must be explicit and tracked.

Each failure mode should have:

- ID (for example `FM-001`)
- name
- definition
- trigger
- impact
- violated invariants
- observables
- containment class
- related tests
- related postmortems

Failure modes should be concrete, not thematic.

Good:
- duplicate execution via retry after timeout

Bad:
- reliability problems in async systems

---

## Baseline vs Protected Mode

When useful, maintain two paths:

- **baseline / unsafe mode**
- **protected / contained mode**

Reason:
A prevention claim is only credible when the baseline failure is reproduced first.

Rules:

- Do not quietly remove the unsafe baseline if it is needed for pedagogical proof.
- Repro tests for known failure modes should remain intact.
- Prevention tests should use the same scenario with a different policy/mechanism.

---

## Durability and Observability Rules

Agents must preserve inspectable state.

Prefer:

- SQLite or other durable local state for tests
- append-only ledgers for effects
- explicit job states
- timestamps and attempt counters
- durable commit records
- state transitions that can be queried after the fact

Avoid:

- hidden in-memory correctness assumptions
- magic behavior without traceability
- side effects with no ledger or audit trail

If a test proves something important, the evidence should be queryable.

---

## Recovery Rules

Correctness under crash is mandatory.

Agents must assume failures can happen:

- before lease
- during execution
- after side effect
- after durable commit
- before finalization
- during retry
- during reconciliation

Any mechanism that is correct only in the happy path is incomplete.

Recovery work should prefer:

- idempotent reconciliation
- explicit state transitions
- no duplicate logical effects
- no unsafe assumptions about exactly-once execution

---

## Agent-Relevance Rule

This lab is about production autonomy governance, not generic queue theory.

When building or documenting a mechanism, connect it to agent/tool execution where applicable.

Examples of relevant mappings:

- tool timeout → retry → duplicate side effect
- model uncertainty → repeated action attempt
- planner/executor split → stale leases or double execution
- long-running tool call → crash after commit before finalization
- external API action → expensive irreversible effect

Each major artifact should say why a serious team building agents would care.

---

## PR / Change Acceptance Criteria

A change is acceptable only if it improves at least one of:

- failure reproduction quality
- invariant clarity
- containment strength
- recovery correctness
- observability
- postmortem quality
- inspectable hiring signal

Each meaningful change should include some combination of:

- test
- doc update
- scenario update
- schema change
- postmortem note

A change should be rejected if it is merely interesting, sophisticated, or aesthetic.

---

## Comments and Explanations

When leaving comments in code or docs:

- explain failure mechanics
- explain why the invariant matters
- explain why the containment works
- explain what evidence a test provides

Do not write decorative comments.
Do not write vague comments like “handle edge cases.”

Prefer comments like:
- “Lease expiry permits retry, so logical effect must be guarded by a durable commit boundary.”
- “This reconciler finalizes committed jobs without re-emitting side effects.”

---

## Testing Rules

Tests are the primary proof artifact.

Prefer tests that show:

- bug reproduction
- violated invariant
- prevention after mitigation
- recovery after crash
- idempotency under retry
- stable behavior under controlled time

Test naming should be descriptive and failure-oriented.

Good:
- `test_repro_duplicate_effect_after_lease_expiry`
- `test_commit_boundary_allows_only_first_logical_effect`
- `test_reconciler_finalizes_committed_job_without_new_effect`

Bad:
- `test_queue`
- `test_policy`
- `test_happy_path`

---

## Simplicity Rule

Use the smallest implementation that proves the reliability point.

Agents must resist:

- premature abstractions
- framework adoption
- over-engineered architecture
- generalized orchestration before one failure mode is fully closed

This repo wins through sharpness, not breadth.

One convincing failure + fix + postmortem is more valuable than a half-built platform.

---

## Homepage / Public Signal Rule

This repo is expected to feed public evidence.

When creating docs or artifacts, prefer outputs that can be surfaced on the website, README, or case studies page.

Artifacts should be legible to a hiring manager or technical lead scanning for:

- judgment
- reliability mindset
- clarity under failure
- ability to design containment
- ability to explain operational relevance

Ask:
**Would this make me more obviously useful to a serious reliability or agent-safety team?**

If not, it is likely drift.

---

## Anti-Drift Protocol

Stop work immediately if the task is becoming:

- branding without proof
- planning without output
- research without reproduction
- refactoring without reliability gain
- abstraction without a motivating incident
- feature work unrelated to failure containment

When drift is detected, redirect to the nearest concrete artifact:
- a failing test
- an invariant
- a minimal schema
- a reproducible scenario
- a postmortem
- a README mapping to agent relevance

---

## Default Decision Rule

When multiple paths are available, choose the one that creates the most credible inspectable signal fastest.

Priority order:

1. executable failure-mode repro
2. prevention test
3. containment primitive
4. recovery mechanism
5. postmortem
6. supporting docs
7. refactor
8. polish

---

## Done Criteria

A task is done only when it leaves behind visible proof.

Usually that means:
- code exists
- test passes
- docs are updated
- failure/invariant linkage is explicit
- the artifact is understandable by someone outside the repo

“Implemented but not demonstrated” is not done.

---

## Final Standard

This codebase should make one thing obvious:

**I do not just build systems that work in demos.  
I build systems that remain correct under retries, crashes, partial failure, and expensive side effects.**
