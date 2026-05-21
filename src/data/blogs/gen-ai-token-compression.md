---
title: "70% fewer Gen AI tokens in a hot path"
date: "2025-01-15"
slug: "70-genai"
tags: ["resourcefulness", "optimization", "gen-ai"]
summary: "Same decision point, 70% fewer tokens, without missing a 24-hour delivery window."
---

# Cut cost without breaking delivery

In startups it is not always about feature velocity. Sometimes it is survival.

I replaced a legacy decision point in our workflow with a Gen AI task. It worked, but it was too expensive at our traffic level.

## Baseline

Per item, the model used about 89 tokens on average:

```txt
Input tokens: 78
Output tokens: 11
Total tokens: 89
```

At peak we processed millions of messages.

The model was `gemini-2.5-flash-lite` at `$0.05 / 1M` tokens. The feature worked, but the hot path cost would compound fast, so I started looking for a different shape for the workload.

## The obvious fix that did not fit

Batching gave us an immediate 50% discount, but with one hard tradeoff:
- results could take up to 24 hours

A high-level view of the workflow:
`Input data -> Preliminary process -> Aggregation (per hour)[Manual decision] -> post processing (per day) -> Delivery`

The whole process had to finish within 24 hours, every day.

So the batched version looked like this:

`Input data -> Preliminary process -> Aggregation (per hour) [Batched Gen AI] -> post processing (per day) [Wait for Batching result] -> Delivery`

That would save money, but it would also push a critical decision point into an async dependency and put the 24-hour SLO at risk.

## What I changed

Instead of batching everything, I batched hourly and compressed the prompt.

We could not batch all `Input data` into one large offline job, but we could batch it every hour. Combining an hourly batched payload with [prompt compression](https://arxiv.org/abs/2508.15813) cut token usage hard without moving the whole workflow into next-day processing.

For a batch of 50 items:

```txt
Input tokens: 975
Output tokens: 399
Total tokens: 1374
```

## What could break

Compression changed the shape of the input, so the risk was not only "will it be cheaper?" It also changed the privacy boundary, the decision boundary, and the blast radius of a bad model response.

The important invariant was:

> Compression may remove tokens, but it must not remove the facts needed to make the same business decision safely.

That created concrete failure modes:

- **Privacy leak:** batching can put more user or business data into one model request. If the prompt includes personal data, internal identifiers, or sensitive commercial context, the batch becomes a larger disclosure unit.
- **Cross-item contamination:** one item in a batch can influence the decision for another item if the prompt does not preserve strict item boundaries.
- **Correctness loss:** prompt compression can remove edge-case details, qualifiers, timestamps, or minority signals that look redundant but change the decision.
- **Silent drift:** a cheaper prompt can keep returning valid-looking outputs while slowly changing the decision boundary, especially when traffic mix changes.
- **Partial batch failure:** a malformed item, timeout, or provider error can block many decisions at once instead of one.
- **Audit gap:** if only the compressed prompt is retained, it may become impossible to explain why the model made a decision.

So I treated the optimization as a reliability change, not just a cost change.

The controls I would expect around this path:

- redact or minimize sensitive fields before compression
- assign a stable item ID and require one output per item ID
- keep strict separators so the model cannot merge two records into one decision
- keep a deterministic sample of uncompressed comparisons
- track disagreement between compressed and original decisions
- alert on output distribution shifts, missing item IDs, duplicate item IDs, and abnormal rejection rates
- cap batch size so one failure does not affect the entire day
- retry failed items individually instead of blindly replaying the whole batch
- preserve enough audit data to explain why a decision was made without storing raw sensitive input indefinitely

The acceptance test is not "the prompt is shorter." It is:

> The compressed path must match the original decision often enough for the business risk, and every disagreement must be measurable, attributable, and recoverable.

That means this kind of optimization needs a shadow run before rollout: send a controlled sample through both the original and compressed paths, compare outputs, inspect disagreements, and only then move traffic gradually.

## Result

Without batching:
`89 * 50 = 4450` tokens

With hourly batching + prompt compression:
`1374` tokens

That is about **70% fewer tokens** in a hot path.

![70% generative ai cost reduction](./public/images/logs/gen_ai_1.png)

## Why it mattered

The point was not just lower cost.

The point was keeping the same business decision in the workflow without turning it into a next-day dependency.

So the result was a better balance:

- lower cost
- no 24-hour delivery miss
- no downstream rewrite
- explicit privacy and correctness risk controls
