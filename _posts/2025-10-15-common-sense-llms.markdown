---
layout: post
title: "Common sense, machines, and what they don't know"
categories: commonsense LLMs AI knowledge Penn
image: common-sense-llms.png
---

The [framework we introduced](/2024/01/16/Quantifying-common-sense.html) for quantifying common sense was built around people — individuals rating claims, and the structure of agreement across a population. The obvious next question is what happens when the raters aren't human.

With [Tuan Dung (Josh) Nguyen](https://tuandung.net) and [Duncan Watts](https://css.seas.upenn.edu/people/duncan-watts/), we applied the same methodology at scale to large language models, evaluating commonsense knowledge in humans and in LLMs on the same set of claims <a class="button smallCaps" href="https://doi.org/10.1093/pnasnexus/pgag029">PNAS Nexus</a>. The comparison is useful both ways: it tells us what current models know in the same terms we used for people, and it exposes where benchmarks designed for humans break down when pointed at a machine.

Running alongside this, a broader community effort — organized by [Vinay Chaudhri](https://www.csl.sri.com/~chaudhri/) with many others — has been articulating what a new knowledge resource for AI might look like, one that goes beyond existing knowledge graphs and taps into the kind of structured, commonsense, and expert knowledge that modern AI systems still struggle to use reliably <a class="button smallCaps" href="https://doi.org/10.1002/aaai.70035">AI Magazine</a>.

Taken together, these projects push at the same question from two sides: how do we measure what machines know, and how do we build the resources that would let them know more?
