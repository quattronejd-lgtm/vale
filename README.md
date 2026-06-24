# Vale

Vale is Joe Quattrone's executive-assistant agent — the system that runs his day and coordinates a fleet of task-specific Cowork agents. This repo is where Vale gets wired into code so the same agents can be triggered by teammates over Slack and email in real time.

## What's here

This repository will hold the runtime, configuration, and integrations that let Vale:

- Run and orchestrate Joe's Cowork agents from code rather than only from chat.
- Accept requests from teammates via Slack and email and route them to the right agent.
- Return results back into those channels in real time.

## Status

Early scaffolding. Structure and stack will firm up as the first integration (Slack) lands.

## Getting started

```bash
git clone https://github.com/quattronejd-lgtm/vale.git
cd vale
```

Copy `.env.example` to `.env` and fill in credentials before running anything (don't commit `.env`).

## Project layout

```
.
├── README.md       # You are here
├── LICENSE         # Proprietary — see file
└── .gitignore      # Node + Python ignores
```

## License

Proprietary. All rights reserved — see [LICENSE](./LICENSE).
