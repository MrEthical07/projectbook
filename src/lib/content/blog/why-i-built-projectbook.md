---
title: Why I built ProjectBook
description: Product teams lose the reasoning behind their work. I built an open-source workspace that makes the link from user insight to shipped task impossible to skip.
date: 2026-07-31
slug: why-i-built-projectbook
draft: true
---

### The thing that kept bothering me

Every product team I've [worked on / built with] eventually loses the plot on its own decisions.

Not dramatically. It happens quietly. A ticket says "add bulk export." Someone builds it. Six months later, someone asks why it works the way it does, and nobody can answer. The user research that justified it is in a document nobody has opened since. The debate about the approach happened in a chat thread that's now unsearchable. The person who framed the problem [has moved to another team / left].

The work survived. The *reasoning* didn't.

[Optional: one or two sentences about a specific time this happened to you. This is the single most valuable paragraph in the post if you're willing to write it, concrete beats abstract every time. If you'd rather not, delete this line.]

### Why "just link things" doesn't work

The obvious answer is that teams should link their work together. Every modern tool supports it. Notion has relations, Linear has parent issues, Jira has issue links.

But every one of those makes linking **optional**, and optional discipline degrades under deadline pressure. It's always the first thing to go. Nobody is deliberately destroying context; they're shipping on Friday.

So the linking either doesn't happen, or it happens inconsistently enough that you can't trust it. And a traceability system you can't trust is worse than none, because now you have to check everything by hand anyway.

### The idea

What if the links weren't optional?

That's the whole premise of ProjectBook. It models product work as one connected chain:

**Story, Problem, Idea, Task, Feedback**

A user story captures real research: who the person is, what's actually hurting them. A problem statement is drawn from one or more of those stories. An idea answers a specific problem. A task implements an idea. Feedback validates whether it worked.

The important part isn't the diagram, plenty of tools could draw that. It's that the system *enforces* it:

- Link a story to a problem statement, and the story's pain points **populate automatically**. You're not retyping context; the context arrives.
- Ideas attach to locked problem statements, so you can't ideate against a problem nobody has framed.
- A task shows you the idea, the problem, and the original user insight behind it. An engineer looking at a task can see why it exists without asking anyone.
- Anything missing its links gets flagged as an **orphan**, visibly, rather than quietly drifting.

This maps onto Design Thinking's phases (Empathize, Define, Ideate, Prototype, Test) but as the actual structure of the data model and the routes, not as labels applied to a generic tracker.

### The trade-off I made on purpose

ProjectBook is more rigid than a blank canvas, and that's a deliberate choice rather than something I'd like to fix.

If your team wants a free-form space to sketch in, this is the wrong tool and I'd honestly point you at Miro or Notion. The bet here is that for teams running real discovery-to-delivery loops, *enforced* structure is worth more than flexibility, because the flexibility is exactly what lets context leak out.

I'd rather build something opinionated that's genuinely great for some teams than something accommodating that's mildly useful to everyone.

### [Optional: what I learned building it]

[If you want a technical section, this is what the HN crowd will actually engage with. Candidates, pick one and give it 2 to 3 paragraphs:

- Why the frontend has **no service layer**: routes call "remote functions" that are the single read/write boundary, owning validation and permission checks. Fewer layers, easier to debug, one obvious place for every rule.
- Why writes are **full-state snapshots** rather than partial patches, deterministic, no merge drift.
- Why I ended up writing **my own auth engine** (goAuth) instead of using an existing one, and what that cost me.

Delete this section entirely if you'd rather keep the post non-technical.]

### Where it is now

ProjectBook is open source under Apache 2.0, and you can self-host the whole thing with `docker compose up`. The hosted version is free while it's in beta.

It's early, and it's a solo project. There are rough edges. But the core loop, insight to problem to idea to task to validation, with the links intact, works, and I use it.

If you've felt the same frustration, I'd genuinely like to know whether this approach resonates or whether you think enforced structure is a mistake. Both are useful.

**Try the demo** (no signup): [demo.projectbook.dev](https://demo.projectbook.dev)

**GitHub:** [github.com/MrEthical07/projectbook](https://github.com/MrEthical07/projectbook)
