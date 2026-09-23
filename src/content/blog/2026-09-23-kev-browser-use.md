---
date: 2026-09-23
title: 'kev-0.6b-browser-use: the best open Jev-like for in-browser use'
template: post
thumbnail: '/thumbnails/website.png'
slug: kev-browser-use
description: 'kev-0.6b-browser-use is a 0.6B Jev-like decision model fine-tuned from Kev for browser use: 32.2% step success on Mind2Web, the best open-weights model that runs in a browser. Try it on WebGPU as it plays A Dark Room.'
ogImage: '/og/kev-browser-use.jpg'
ogImageAlt: 'kev-0.6b-browser-use playing A Dark Room in the browser, with every button it weighed and its confidence.'
categories:
  - Agents
tags:
  - Kev
  - Jev
  - Browser agents
  - Mind2Web
  - WebGPU
---

[kev-0.6b-browser-use](https://github.com/arbazsiddiqui/kev-browser-use) is a decision model for browser agents. It reads a goal and a list of the page's candidate elements, then returns which element to act on and whether to click, type or select, as probabilities, in one forward pass. It never writes text, so every answer is one of the elements already on the page.

It gets 32.2% of Mind2Web steps fully right, the right element and the right action, the best of any open-weights model that runs in a browser. So below, it runs in yours, as a 348 MB 4-bit build.

## Demo

Below, the model plays [A Dark Room](https://github.com/doublespeakgames/adarkroom), the text adventure by Doublespeak Games, running unmodified on this page. It starts in a small village, loaded from a save in the game's own format. Pick a goal or type one, and the model answers every question on the way: which button to press out of everything the game shows, how to get what's missing, and how many villagers to put on it.

<link rel="stylesheet" href="/kev-browser-use-demo/demo.css" />
<div id="kbu-demo" class="kbu"><noscript>The demo needs JavaScript and WebGPU.</noscript></div>
<script type="module" src="/kev-browser-use-demo/demo.js"></script>

Nothing is scripted per goal. For "Craft a rucksack" the model picks the rucksack button out of about 20, and the game says "not enough leather". The page asks the model how to get 30 more, listing the stores, the villagers and every source the game has; it picks tanner, then three more tanners from options that show the wait. Once the leather is in, it crafts the rucksack. Goals work best when they name the thing, like "build a trap"; loose ones like "make a weapon" often miss.

The worker arrows have no text, so they're offered as "hunter +1" and "hunter -1". With more than 10 buttons, the model picks one from each group of 10 and then picks among the winners.

Add `?model=base` to the address to load Kev-0.6B as released, before fine-tuning.

## Results

1,000 steps from Mind2Web's test set. Each step gives a goal, the previous actions and 10 candidate elements. Every model sees the same text and the same candidates.

![Element accuracy, operation accuracy and step success for every model on 1,000 Mind2Web steps](/kev-browser-use-demo/results.png)

| Model | Size | Step success | Element accuracy | Operation accuracy | Brier (lower is better) | p50 latency |
|---|---|---|---|---|---|---|
| Jev (TypeSafe, hosted API) | closed | 43.5 | 47.9 | 82.7 | 0.73 | network |
| Kev-9B | 9B | 32.5 | 38.7 | 78.7 | 0.76 | 428 ms |
| **kev-0.6b-browser-use** | **0.6B** | **32.2** | **36.1** | **83.6** | 0.84 | 80 ms |
| SemIf, frozen Qwen3.5-4B | 4B | 30.0 | 38.4 | 75.2 | 0.85 | 289 ms |
| Bespoke Nimble-9B | 9B | 26.2 | 38.5 | 59.6 | 0.87 | 979 ms |
| decider-2B | 2B | 24.7 | 33.0 | 62.5 | 0.87 | 139 ms |
| Kev-0.6B (base) | 0.6B | 14.1 | 20.6 | 67.4 | 1.06 | 78 ms |
| NanoJev | 0.6B | 4.2 | 13.1 | 16.4 | 0.92 | 245 ms |
| Laya | 421M | 3.8 | 10.7 | 33.4 | 0.98 | 40 ms |
| Random |  | 3.6 | 10.5 | 35.5 | 0.94 |  |

- **Step success:** the correct element and the correct action in the same step, the number that matters for an agent.
- **Element accuracy:** the model picked the correct UI element.
- **Operation accuracy:** it chose the correct action on that element (click, type or select).
- **Brier (lower is better):** how good the model's probabilities are, not just its top pick. It adds up the squared error over all 10 candidates, so it runs from 0 to 2 and hits 2 when the model is certain of a wrong element.

Latency is one decision on an NVIDIA L4. The numbers in the demo are your own device's, measured live.

## Training data

Kev-0.6B as released had never seen a web page and got 14.1% of steps right. Fine-tuning on Mind2Web's training split, 13.8K steps, took it to 29.9, almost the whole gain. Adding WebChain for four times the rows reached 32.2.

Quick tests at equal size said more websites and teacher labels did not help. Mind2Web's paper reports 30 to 32 for a fine-tuned 250M model and 39 to 40 for 3B, so the gap to Jev looks like model size.

## Use it

In the browser, the 4-bit build runs with [open-jev](https://www.npmjs.com/package/open-jev):

```bash
npm install open-jev @huggingface/transformers
```

```js
import { OpenJev, choice } from "open-jev";

const kev = await OpenJev.load({ model: "arbazsiddiqui/kev-0.6b-browser-use-ONNX", dtype: "q4f16" });

const state = `Goal: Type "Alan Turing" into the search box
Candidate elements:
[0] <a> role=None "Main page"
[1] <input> role=searchbox "Search Wikipedia"
[2] <button> role=None "Search"`;

const { element, operation } = await kev.decide(state, {
  element: choice("Which element should be acted on?", [
    '[0] <a> "Main page"',
    '[1] <input> "Search Wikipedia"',
    '[2] <button> "Search"',
  ]),
  operation: choice("What operation should be performed on the target element?", ["CLICK", "TYPE", "SELECT"]),
});

element.choice;     // '[1] <input> "Search Wikipedia"', confidence 0.93
operation.choice;   // "TYPE", confidence 0.74
```

On a server, the full-precision checkpoint is a LoRA adapter plus a pointer head in [Kev](https://github.com/jaredpalmer/kev)'s format and runs on Kev's own server. The repository has the eval harness, the training code and the commands for both.

[Code](https://github.com/arbazsiddiqui/kev-browser-use) &middot; [Model](https://huggingface.co/arbazsiddiqui/kev-0.6b-browser-use)
