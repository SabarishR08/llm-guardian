# Graph Report - E:\mcp-guardian - Copy\mcp-guardian - Copy  (2026-07-24)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 924 nodes · 2136 edges · 87 communities (52 shown, 35 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- hero.tsx
- telemetry/store.ts
- pipeline.py
- schemas/events.py
- topbar.tsx
- constants.ts
- compilerOptions
- agent-timeline.tsx
- api/events.py
- charts.tsx
- test_engine.py
- devDependencies
- Simulator
- main.py
- cn
- ReplyContext
- chat_orchestrator.py
- api/auth.py
- test_llm_classifier.py
- react
- mcp_bridge.py
- live-rail.tsx
- chat/store.ts
- run_turn
- event_store.py
- utils.ts
- graph/page.tsx
- test_chat.py
- settings/page.tsx
- UserStore
- chat.py
- test_api.py
- logo.tsx
- message-list.tsx
- live-mcp-panel.tsx
- dependencies
- server.py
- config.py
- PIIDetector
- ConnectionManager
- app/layout.tsx
- PromptInjectionDetector
- schema_anomaly.py
- ToxicityDetector
- overview/page.tsx
- auth/store.ts
- client.ts
- normalizer.py
- smoke_test.py
- .inspect
- test_chat_stream.py
- start.sh
- .upgraded
- class-variance-authority
- clsx
- next.config.ts
- date-fns
- framer-motion
- next
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-label
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-scroll-area
- @radix-ui/react-select
- @radix-ui/react-separator
- @radix-ui/react-slot
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-tooltip
- react-dom
- react-markdown
- recharts
- remark-gfm
- sonner
- tailwind-merge
- tw-animate-css
- zustand
- postcss.config.mjs
- setup.sh script
- bridge.py

## God Nodes (most connected - your core abstractions)
1. `cn()` - 103 edges
2. `react` - 38 edges
3. `useTelemetry` - 31 edges
4. `ThreatCategory` - 30 edges
5. `InspectionContext` - 29 edges
6. `DetectionSignal` - 26 edges
7. `Detector` - 23 edges
8. `InspectRequest` - 20 edges
9. `CATEGORIES` - 18 edges
10. `ThreatCategory` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Aggregation` --uses--> `DetectionSignal`  [INFERRED]
  backend/app/engine/aggregator.py → backend/app/schemas/events.py
- `Aggregation` --uses--> `ThreatCategory`  [INFERRED]
  backend/app/engine/aggregator.py → backend/app/schemas/events.py
- `PIIDetector` --uses--> `InspectionContext`  [INFERRED]
  backend/app/engine/detectors/pii.py → backend/app/engine/base.py
- `PromptInjectionDetector` --uses--> `InspectionContext`  [INFERRED]
  backend/app/engine/detectors/prompt_injection.py → backend/app/engine/base.py
- `SchemaAnomalyDetector` --uses--> `InspectionContext`  [INFERRED]
  backend/app/engine/detectors/schema_anomaly.py → backend/app/engine/base.py

## Import Cycles
- None detected.

## Communities (87 total, 35 thin omitted)

### Community 0 - "hero.tsx"
Cohesion: 0.06
Nodes (36): GuardianMark(), SectionHeading(), Architecture(), STEPS, CTA(), DetectionEngine(), DETECTORS, FAQ() (+28 more)

### Community 1 - "telemetry/store.ts"
Cohesion: 0.09
Nodes (48): Scenario, InteractiveDemo(), GuardianVerdictPayload, MessageRole, ThreatEvidence, analyze(), CATEGORY_ACTIONS, LocalAnalysis (+40 more)

### Community 2 - "pipeline.py"
Cohesion: 0.11
Nodes (23): aggregate(), Aggregation, DetectionSignal, ThreatCategory, Risk aggregation - fuse detector signals into a single verdict., Weighted fusion.      The dominant signal sets the floor; corroborating signal, severity_for_score(), deterministic_explanation() (+15 more)

### Community 3 - "schemas/events.py"
Cohesion: 0.17
Nodes (22): Detector, InspectionContext, Detector base class and shared primitives.  Every detector is a self-contained, Everything a detector needs to assess a single message., EncodedPayloadDetector, _entropy(), DetectionSignal, Encoded / obfuscated payload detection.  Flags high-entropy or encoded spans ( (+14 more)

### Community 4 - "topbar.tsx"
Cohesion: 0.09
Nodes (25): DashboardLayout(), Command, CommandPalette(), ALL_NAV_ITEMS, NAV_SECTIONS, NavItem, NavSection, ConnectionCard() (+17 more)

### Community 5 - "constants.ts"
Cohesion: 0.18
Nodes (18): RadialGauge(), EventDetail(), LiveFeed(), EmptyState(), PageHeader(), Panel(), RiskMeter(), StatCard() (+10 more)

### Community 6 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 7 - "agent-timeline.tsx"
Cohesion: 0.12
Nodes (20): AgentTimeline(), analysisNode(), argString(), buildTimeline(), decisionNode(), DETECTORS, finalResponseNode(), NodeStatus (+12 more)

### Community 8 - "api/events.py"
Cohesion: 0.13
Nodes (18): get_current_user(), User, Shared API dependencies., get_stats(), list_events(), GuardianEvent, User, Event & stats read endpoints (auth-protected). (+10 more)

### Community 9 - "charts.tsx"
Cohesion: 0.15
Nodes (14): REPORTS, ReportsPage(), AXIS, CategoryDonut(), RiskTrendChart(), VerdictBreakdown(), VerdictStackChart(), selectCategoryBreakdown() (+6 more)

### Community 10 - "test_engine.py"
Cohesion: 0.15
Nodes (20): Verdict, verdict_for_score(), _inspect(), Detection-engine tests - verify each detector and the verdict bands., Idioms and neutral references to sexual orientation must NOT flag., SHA/MD5 hashes and IOC lists must not be flagged as encoded payloads., Sexual harassment / non-consensual imagery / hate slurs must BLOCK., test_benign_is_allowed() (+12 more)

### Community 11 - "devDependencies"
Cohesion: 0.10
Nodes (20): devDependencies, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript, name (+12 more)

### Community 13 - "main.py"
Cohesion: 0.11
Nodes (20): inspect(), Inspection endpoints - the public firewall API., Inspect a single message and return the full assessment.      This is the endp, Health & capability introspection., call(), Live MCP tool-call endpoint.  Calls the real, sandboxed filesystem MCP server, Call a real tool on the sandboxed MCP server, then inspect its response., WebSocket (+12 more)

### Community 14 - "cn"
Cohesion: 0.14
Nodes (15): ToggleRow(), Content(), EventRow(), Card(), CardContent(), CardDescription(), CardFooter(), CardHeader() (+7 more)

### Community 15 - "ReplyContext"
Cohesion: 0.25
Nodes (17): compose_deterministic_reply(), _humanize_tool(), _indicator_clause(), is_llm_available(), Chat reply generation.  ARCHITECTURAL RULE: the assistant reply is ALWAYS deri, The real pipeline state the reply must describe., ReplyContext, _state_briefing() (+9 more)

### Community 16 - "chat_orchestrator.py"
Cohesion: 0.18
Nodes (17): _build_evidence(), _build_sanitized_preview(), _confidence_label(), _inspect(), _matched_indicators(), Any, Chat turn orchestrator.  Runs one real agent turn and yields a sequence of eve, Line-level redaction: replace whole lines that contain a detected     indicator (+9 more)

### Community 17 - "api/auth.py"
Cohesion: 0.18
Nodes (16): AuthResponse, forgot(), login(), me(), User, Authentication endpoints., register(), create_access_token() (+8 more)

### Community 18 - "test_llm_classifier.py"
Cohesion: 0.16
Nodes (14): _call_groq(), classify(), is_available(), DetectionSignal, LLM semantic classifier - the escalation tier of the hybrid detector.  The heu, Return an escalating DetectionSignal, or None to leave the verdict as-is., should_escalate(), Tests for the hybrid LLM classifier tier.  The network call to Groq is mocked, (+6 more)

### Community 19 - "react"
Cohesion: 0.21
Nodes (16): react, ForgotPasswordPage(), LoginPage(), RegisterPage(), strength(), ChatLayout(), AnalyticsPage(), LogsPage() (+8 more)

### Community 20 - "mcp_bridge.py"
Cohesion: 0.18
Nodes (13): tools(), call_tool(), list_tools(), McpBridgeError, Bridge to the real, sandboxed filesystem MCP server.  Guardian's backend intenti, Returns (content_text, is_error)., _run_bridge(), Tests for the real, sandboxed MCP filesystem server integration.  These exercise (+5 more)

### Community 21 - "live-rail.tsx"
Cohesion: 0.22
Nodes (11): ChatPage(), ChatSidebar(), Composer(), CHAT_TOOLS, ConnBadge(), LiveRail(), MiniStat(), useActiveTurn() (+3 more)

### Community 22 - "chat/store.ts"
Cohesion: 0.17
Nodes (11): ChatState, handleEvent(), SessionActivity, SessionThreat, TOOL_SOURCE_LABEL, verdictPayload(), ChatStreamEvent, streamChatTurn() (+3 more)

### Community 23 - "run_turn"
Cohesion: 0.25
Nodes (14): status(), run_turn(), is_available(), list_documents(), Tool implementations available to the chat agent.  Two are genuinely live (`re, Simulated - no real search provider is configured for this demo., Simulated - never actually sends anything., Persist a user-uploaded document to the sandbox and read it back through     th (+6 more)

### Community 24 - "event_store.py"
Cohesion: 0.18
Nodes (7): GuardianEvent, BaseModel, StatsResponse, EventStore, GuardianEvent, Event store - Redis-backed when available, in-memory ring buffer otherwise.  A, Pre-load plausible totals so a fresh boot reads like an active day.

### Community 25 - "utils.ts"
Cohesion: 0.34
Nodes (6): PasswordInput, Button, ButtonProps, buttonVariants, Input, Label

### Community 26 - "graph/page.tsx"
Cohesion: 0.20
Nodes (12): dims(), EDGES, GEdge, GNode, GraphPage(), inPoint(), isNeighbor(), Kind (+4 more)

### Community 27 - "test_chat.py"
Cohesion: 0.22
Nodes (13): Decide whether/what tool to call for this message. Returns (tool, args)., route_intent(), _collect(), Tests for the chat orchestrator and tool routing.  Exercises the real turn pipel, A user-uploaded document is read through the real MCP tool, then inspected., test_benign_message_allows_and_replies(), test_clean_document_is_allowed(), test_inbound_jailbreak_blocked_without_tool_call() (+5 more)

### Community 28 - "settings/page.tsx"
Cohesion: 0.23
Nodes (8): OUTBOUND_INTEGRATIONS, Badge(), BadgeProps, badgeVariants, Switch, TabsContent, TabsList, TabsTrigger

### Community 29 - "UserStore"
Cohesion: 0.30
Nodes (4): hash_password(), verify_password(), User, UserStore

### Community 30 - "chat.py"
Cohesion: 0.27
Nodes (8): capabilities(), chat_turn(), ChatAttachment, ChatMessage, ChatTurnRequest, BaseModel, StreamingResponse, Chat turn endpoint - streams a real agent turn as Server-Sent Events.

### Community 31 - "test_api.py"
Cohesion: 0.24
Nodes (4): _auth(), API smoke tests via TestClient (exercises lifespan, auth, and endpoints)., test_login_and_me(), test_stats_requires_auth()

### Community 32 - "logo.tsx"
Cohesion: 0.31
Nodes (5): Logo(), COLUMNS, Footer(), LINKS, Navbar()

### Community 33 - "message-list.tsx"
Cohesion: 0.22
Nodes (6): CodeBlock(), Markdown(), DEMO_PROMPTS, EmptyState(), MessageList(), ChatMessage

### Community 34 - "live-mcp-panel.tsx"
Cohesion: 0.29
Nodes (7): LiveMcpPanel(), PRESETS, ToolName, VerdictRow(), mcpCallTool(), mcpStatus(), McpToolResult

### Community 35 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, lucide-react, next-themes, @radix-ui/react-avatar, @xyflow/react, lucide-react, next-themes, @radix-ui/react-avatar (+1 more)

### Community 36 - "server.py"
Cohesion: 0.25
Nodes (8): list_files(), A real MCP filesystem server, hard-sandboxed to a single folder.  Built on the, Resolve `name` inside SANDBOX_ROOT or raise - blocks traversal/absolute paths., List every file available in the sandboxed directory., Read the contents of one file inside the sandboxed directory.      Args:, read_file(), _resolve_safe(), Path

### Community 37 - "config.py"
Cohesion: 0.29
Nodes (5): get_settings(), Application configuration, loaded from environment / .env., Settings, Shared test fixtures.  The LLM classifier (hybrid detection tier) is non-deter, BaseSettings

### Community 38 - "PIIDetector"
Cohesion: 0.29
Nodes (3): _luhn_ok(), PIIDetector, DetectionSignal

### Community 39 - "ConnectionManager"
Cohesion: 0.29
Nodes (3): ConnectionManager, GuardianEvent, WebSocket

### Community 40 - "app/layout.tsx"
Cohesion: 0.29
Nodes (5): geistMono, geistSans, metadata, viewport, Providers()

### Community 42 - "schema_anomaly.py"
Cohesion: 0.38
Nodes (5): _depth(), _has_suspicious_keys(), DetectionSignal, Schema anomaly detection.  For tool responses, unexpected structure (deeply nest, SchemaAnomalyDetector

### Community 44 - "overview/page.tsx"
Cohesion: 0.38
Nodes (4): OverviewPage(), TrafficChart(), formatCompact(), formatNumber()

### Community 45 - "auth/store.ts"
Cohesion: 0.33
Nodes (6): AuthResponse, AuthState, DEMO_USER, demoSession(), nameFromEmail(), User

### Community 46 - "client.ts"
Cohesion: 0.33
Nodes (5): ApiError, apiRequest(), checkBackendHealth(), RequestOptions, setAuthToken()

### Community 47 - "normalizer.py"
Cohesion: 0.53
Nodes (5): _fold_homoglyphs(), normalize(), Content normalization + decoding.  Attackers hide instructions behind encodings, _try_b64(), _try_hex()

### Community 48 - "smoke_test.py"
Cohesion: 0.47
Nodes (4): _get(), inspect(), main(), _post()

### Community 86 - "bridge.py"
Cohesion: 0.67
Nodes (3): main(), Stdio JSON bridge for the sandboxed filesystem MCP server.  Lets a process in, run()

## Knowledge Gaps
- **141 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+136 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `logo.tsx`, `message-list.tsx`, `live-mcp-panel.tsx`, `dependencies`, `topbar.tsx`, `constants.ts`, `hero.tsx`, `agent-timeline.tsx`, `telemetry/store.ts`, `charts.tsx`, `overview/page.tsx`, `cn`, `live-rail.tsx`, `graph/page.tsx`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `devDependencies`, `react`, `class-variance-authority`, `clsx`, `date-fns`, `framer-motion`, `next`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-label`, `@radix-ui/react-popover`, `@radix-ui/react-progress`, `@radix-ui/react-scroll-area`, `@radix-ui/react-select`, `@radix-ui/react-separator`, `@radix-ui/react-slot`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`, `react-dom`, `react-markdown`, `recharts`, `remark-gfm`, `sonner`, `tailwind-merge`, `tw-animate-css`, `zustand`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `logo.tsx`, `hero.tsx`, `message-list.tsx`, `live-mcp-panel.tsx`, `topbar.tsx`, `constants.ts`, `agent-timeline.tsx`, `charts.tsx`, `react`, `live-rail.tsx`, `utils.ts`, `graph/page.tsx`, `settings/page.tsx`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `ThreatCategory` (e.g. with `Aggregation` and `Detector`) actually correct?**
  _`ThreatCategory` has 13 INFERRED edges - model-reasoned connections that need verification._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _141 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `hero.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05632360471070148 - nodes in this community are weakly interconnected._
- **Should `telemetry/store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08709273182957393 - nodes in this community are weakly interconnected._