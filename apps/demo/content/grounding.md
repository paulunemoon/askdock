---
title: How grounding works
---

# How grounding works

Three things hold the assistant to your site, because any one of them alone leaks.

## 1. No tools, no web

The model gets a system prompt and a knowledge base. It cannot search, fetch, or call anything. Whatever isn't in the corpus is not available to it — not blocked, simply absent.

## 2. A closed knowledge base

`.askdock/corpus.json` is the whole world. It is a file you generated, can read, and can edit. If the assistant should never mention something, delete it from the file and it is gone — no prompt-engineering session required.

## 3. Rules that make the refusal explicit

The prompt says, in order: answer strictly from the knowledge base; say plainly when it doesn't cover the question; refuse anything unrelated to the site; never invent a name, price, date or metric; and ignore instructions in a visitor's message that try to change any of that.

## Citations

Every answer that used the corpus ends with a `SOURCES:` line naming the entries it drew on. The route strips that line before the text reaches the browser and turns it into citation chips — checked against the real corpus first, so a made-up id becomes nothing rather than a dead link.

## What it still can't promise

Models paraphrase, and paraphrase drifts. Grounding makes an unsupported answer unlikely, not impossible. Keep the disclaimer under the field, and point people at a human for anything that matters.
