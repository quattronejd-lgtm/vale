# Nozempic

Turns the *Nozempic* manuscript into serialized newsletter content (Substack / Beehiiv) and
short-form social posts (Facebook / Instagram) — one source manuscript, many small posts.
Lives in the same repo as Harold but is a **fully separate project**: own folder, own
dependencies, own GitHub Actions workflow, own credentials. Nothing here touches GNN/Harold.

The book is framed as an AI-assisted weight-loss story, but the actual content is a closed-loop
self-improvement framework (Awareness → Audit → Adjustment → Repeat) — the pipeline's job is to
de-couple the universal framework material from the weight-loss-specific surface detail so it
reads naturally on its own, not just as diet content wearing a costume.

## The two-agent pipeline

| Stage | Module | What it does |
|-------|--------|---------------|
| atomize | `src/atomize.js` | Read one chapter → break it into discrete "content atoms" (a story beat, a habit mechanic, a loop-execution moment). Tag each atom's universal theme separately from its weight-loss-specific surface, and how easily it generalizes without the hook. |
| repurpose | `src/repurpose.js` | Take one atom + one target channel → write channel-native copy under a locked voice guide: Substack/Beehiiv get a longer serialized entry, FB/IG get a short hook + caption fanned out from the same atom. |

`src/run.js` will orchestrate atomize → repurpose → (review) → publish, per chapter, once the
pieces below are filled in — same shape as Harold's `fetch → editorial → render → publish`.

## Why this isn't fully autonomous like Harold

Harold posts a wire-service feed with no human in the loop by design. This is Joe's name, his
book, and his coaching brand — a bad repurposing choice (wrong tone, an atom that reads as a
weight-loss post when it shouldn't) is a brand problem, not a missed headline. Plan is a
**review/approve gate between repurpose and publish**, at least until the voice guide has proven
itself across enough posts to trust unattended.

## Known channel constraints

- **Beehiiv** — has a public REST API for creating posts. Straightforward to automate.
- **Substack** — **no public API for publishing.** Realistic options: draft via API-less
  workaround (email-to-post, if Substack still supports it) or generate the draft here and have
  a human paste it in. Not solvable by adding more code on our side.
- **Facebook / Instagram** — same Graph API pattern as Harold (`publish.js` there is a working
  reference), but **a separate Meta app + separate IG/FB Business account** for the coaching
  brand — do not reuse Harold/GNN's token or pages.

## Open questions before real implementation

1. **Source of truth for the manuscript.** There's an unresolved cleanup-doc question in the
   Drive folder (Chapter 3 rebuild, pending renames/deletions, the "One Closed Loop" naming
   decision) — need to know if that's settled before atomize.js reads chapters for real.
2. **Voice guide.** Harold's "copy constitution" (single-highlight rule, no mid-sentence
   cutoffs) worked because it was written down and locked before any code shipped. Need the
   equivalent for Nozempic's voice — how universal vs. how weight-loss-specific by default, tone,
   banned phrases, etc.
3. **Credentials.** Beehiiv API key, and a separate Meta Business app + IG/FB tokens for the
   coaching brand's accounts (see Harold's README "Publishing to Instagram" section for the
   token-flavor setup pattern to replicate).
4. **Review mechanism.** Where does a human actually approve a batch before it posts — a
   generated preview file/artifact (like Harold's card upload), a Slack/email digest, something
   else?

## Layout

```
nozempic/
  src/
    atomize.js     # chapter text -> content atoms (stub)
    repurpose.js   # atom + channel -> platform copy (stub)
    run.js         # orchestrator (not yet wired up)
  data/            # ledger of atoms already repurposed/published, once real
```
