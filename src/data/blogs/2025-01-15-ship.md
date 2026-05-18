---
title: "70% fewer Gen AI tokens in a hot path"
date: "2026-04-14"
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
