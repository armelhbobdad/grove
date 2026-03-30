# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2026-03-30

### Added

- **AI settings page** — new settings page with audio transcription configuration and AI provider management
- **Bulk comment cleanup** — review comments can now be bulk-resolved with status and author filters

### Improved

- **ACP chat session management** — refined session management UI with optimized chat history loading and prevention of load_session replay duplication
- **ACP chat tool display** — improved tool call rendering UX in chat conversations
- **ACP chat stability** — fixed message state drift, review resolve behavior, observer mode, and overall chat UI stability
- **MCP upgrade** — upgraded rmcp to 1.3 with inlined nested schemas for better agent compatibility

### Fixed

- **Weekly activity chart** — corrected bar rendering in the weekly activity chart

## [0.7.14] - 2026-03-26

### Added

- **Image lightbox** — clicking image thumbnails in chat (both input attachments and sent messages) now opens a fullscreen lightbox overlay with Escape key support, replacing the previous open-in-new-tab behavior

### Improved

- **ACP package migration** — `claude-code-acp` has been renamed to `claude-agent-acp`. Settings now prefer the new package, with automatic fallback to the deprecated name. Users with only the old package see a single upgrade banner with copy-to-clipboard install command

## [0.7.13] - 2026-03-26

### Added

- **Shell mode** — press `!` in chat to execute terminal commands directly, bypassing the AI agent. Commands run in the task's worktree with real-time streaming output, exit code display, and kill support via the stop button
- **GUI daemonize** — `grove gui` now forks to background and releases the terminal immediately. Closing the terminal no longer kills the GUI window. Logs written to `~/.grove/gui.log`

### Improved

- **Chat history compaction** — terminal output chunks are now merged during history compaction, preventing unbounded history file growth
- **Chat history replay** — unresolved terminal executions are automatically cancelled on reconnect, preventing stuck "running..." indicators
- **ESLint cleanup** — removed unnecessary eslint-disable comments across the codebase, fixing root causes instead of suppressing warnings

## [0.7.12] - 2026-03-25

### Added

- **Chat file path navigation** — clicking file path links in ACP Chat messages now opens the Review panel in All Files mode, scrolls to the target file and line, with a flash highlight animation
- **Chat attachment resource links** — chat attachments can now include resource links
- **Grove MCP server injection** — ACP sessions now have the Grove MCP server injected for task orchestration

### Fixed

- **Permission prompt resolution** — fixed permission prompt targeting to resolve against the correct chat session
- **CI build** — use pnpm for eslint CI job; use Node 20 LTS to avoid npm exit handler crash; add .npmrc with legacy-peer-deps for React 19

### Improved

- **UI selection behavior** — refined selection behavior and chat interactions across the web frontend

## [0.7.11] - 2026-03-24

### Added

- **Context-aware command palette ranking** — command suggestions are now ranked by page context and usage intent, with a dedicated ranking utility shared across Blitz and Tasks pages

### Changed

- **Task Chat composer redesign** — the Web chat composer now uses a floating, narrower workbench-style layout with integrated Todo/Plan/Pending controls, relocated Model/Mode controls, and improved panel toggling behavior
- **Task Chat busy state styling** — replaced the previous SVG-based busy border treatment with a border-focused animated highlight implementation
- **Terminal theme settings** — Web terminal theme selection is now aligned with the app theme model and no longer relies on the old standalone terminal theme config path

### Improved

- **Web terminal interactions** — improved terminal hotkeys, tab lifecycle handling, and backend terminal event behavior for better focus/restore behavior inside FlexLayout
- **Tasks page command palette flow** — palette switching behavior on the Tasks page is more reliable and consistent when moving between views

### Fixed

- **Task palette switching** — fixed incorrect command palette context switching on the Tasks page
- **Terminal lifecycle edge cases** — fixed several Web terminal lifecycle and hotkey edge cases across the frontend and terminal handler

## [0.7.10] - 2026-03-24

### Changed

- **Workspace redesign** — removed top toolbar and left sidebar activity bar; workspace now has a clean two-layer layout: breadcrumb bar + FlexLayout tabs
- **Workspace bar** — new breadcrumb bar with back button, project name, task name, branch info, and inline git action buttons (Commit/Merge/Sync + overflow menu)
- **Panel add menu** — moved to FlexLayout tab bar [+] hover dropdown; includes all panel types (Chat/Terminal/Review/Editor/Stats/Git/Notes/Comments)
- **Sidebar Search** — added Search button with ⌘K shortcut hint to app sidebar footer
- **Empty workspace state** — shows quick-add panel buttons and ⌘K hint when no panels are open
- **Default workspace** — new workspaces start empty; user chooses what to open (saved layouts still restore)

### Improved

- **Workspace padding** — reduced from 24px to 8px in workspace mode, maximizing content area
- **Workspace transition** — smooth scale + opacity animation when entering/exiting workspace
- **Tab numbering** — panel numbers now based on max existing number +1 instead of ever-incrementing counter; resets properly when all tabs close
- **Comments icon** — now uses MessageCircle to distinguish from Chat's MessageSquare
- **Maximize button** — shows Minimize2 icon when panel is maximized for clearer restore affordance
- **Code quality** — translated all Chinese comments to English, removed dead code, wrapped handlers in useCallback, fixed stale closure dependencies

## [0.7.9] - 2026-03-23

### Changed

- **Unified task display** — merged "Current Branch" and "Other Branch" tabs into a single "Active Tasks" tab; tasks from all branches are now shown together with target branch labels
- **Cross-branch merge** — merge now works regardless of which branch you're on; automatically checks out the target branch, merges, and returns to the original branch
- **Local Task Review** — Local Task now compares against the default branch (main/master) instead of HEAD, enabling meaningful code review diffs
- **Task type icons** — replaced status-based icons with type-based icons: Laptop (local), ⚡ (agent), Code (regular); consistent across TUI and Web
- **New Task dialog** — target branch is now selectable via dropdown with loading indicator and click-outside-to-close

### Improved

- **Performance: lazy file changes** — removed `file_changes` (additions/deletions) computation from task loading; data is now fetched on-demand via the diff API when viewing task details, dramatically improving load times for large projects
- **Performance: non-blocking API** — heavy git I/O handlers (`get_project`, `list_tasks`, `get_task`, `get_stats`) now run on tokio's blocking thread pool via `spawn_blocking`, preventing one slow project from blocking all other API requests
- **Performance: removed live_count computation** — project listing no longer checks session existence for every task, reducing unnecessary subprocess calls

### Fixed

- **Merge checkout warning** — if checkout back to the original branch fails after a successful merge, the warning is now displayed to the user instead of being silently ignored
- **DirtyBranchDialog** — improved error messages for main repository uncommitted changes vs worktree uncommitted changes

### Removed

- **"X live" display** — removed live task count from project selector and project cards (preparing for status model simplification)
- **File changes in task list** — removed +additions/-deletions display from task list items and TUI worktree table (data available on-demand in task detail view)

## [0.7.8] - 2026-03-19

### Added

- **Local Task** — lightweight non-worktree task per project for quick notes and planning without creating a git worktree
- **ACP: Cursor Agent and Junie support** — added new agent types with unified agent icon system
- **ACP: Plan file content embedding** — `PlanFileUpdate` events now embed the full plan file content; bottom panel UX improvements
- **Web: VSCode file icons in Review Panel** — All Files mode now displays VSCode-style file/folder icons instead of generic "M" status badges

### Fixed

- **Web: Tool section auto-expand logic** — improved auto-expand behavior and summary text for tool sections in chat
- **CI: Rust cache cross-tag sharing** — fixed cache key strategy and added full cache warm-up step

## [0.7.7] - 2026-03-03

### Added

- **Statistics page** (beta) — project-level productivity analytics with flexible time range picker; sections include AI Work Breakdown (tool calls/task, plans/task, spec-length vs interventions scatter), Review Intelligence (AI adoption rate, hit rate, rounds-per-fix), and Agent Leaderboard (canonical name aggregation, work + review panels); backed by a real `GET /api/v1/projects/{id}/statistics` API with lazy range aggregation and code snapshot on task archive

## [0.7.6] - 2026-03-02

### Added

- **GUI: macOS app bundle support** — detects `.app/Contents/MacOS/` launch path and forces GUI mode; expands `PATH` from login shell on startup so `tmux`, `claude`, and `fzf` are found correctly inside the bundle
- **GUI: In-app updates** — download progress bar and restart dialog for AppBundle installs; new `/api/v1/app-update/{start,progress,install}` endpoints; CI now produces a universal (arm64 + x86_64) DMG via `build-macos-dmg` job
- **Web: Branch drawer task actions** — all tasks in the branch drawer are now clickable and expand an action menu; active tasks support Go To Task (current branch only), Rebase (reuses `RebaseDialog` with branch picker), Archive, and Clean; archived tasks section (collapsed by default) supports Recover and Clean; dialogs open without closing the drawer

### Fixed

- **Web: Branch drawer shows archived tasks** — backend `get_project` now explicitly loads archived worktrees so they appear in the Active/Archived sections of the branch drawer
- **Web: Sidebar task counts update after mutations** — `refreshSelectedProject` now also refreshes the project list so the "x tasks • y live" counts in the project selector stay in sync after Archive, Clean, Recover, and New Task operations
- **Web: Diff review refresh reloads comments** — clicking the refresh button on the review page now reloads both the diff and the review comments simultaneously
- **Web: Branch drawer backdrop gap** — fixed a white strip at the bottom of the backdrop caused by Tailwind v4 `space-y-6` adding `margin-bottom` to the fixed overlay; resolved with `m-0`

## [0.7.5] - 2026-02-28

### Added

- **Web: Plan panel** — detect when an ACP agent writes a `.md` file via the Write tool in Plan Mode and render it in a collapsible panel with Markdown; auto-refreshes on subsequent Write or Edit operations to the same file
- **Web: Diff review refresh button** — added a refresh button to the diff review page header for manual reload
- **Web: Markdown preview** — added preview mode for `.md` files with hotkey toggle
- **Web: Full-window file drop zone** — drag-and-drop area now covers the entire Chat window instead of just the input area
- **MCP: ACP Chat management tools** — orchestrator agents can now create chats, send prompts, and read chat history via `grove_create_chat`, `grove_send_prompt`, `grove_list_chats`, `grove_read_chat_history` MCP tools
- **MCP: `grove_edit_note` tool** — orchestrator agents can programmatically edit task notes
- **MCP: Context-aware tool filtering** — tools are dynamically filtered by task context; orchestrator agents see management tools, worker agents see execution tools
- **MCP: Fuzzy search for query parameters** — `grove_list_projects`, `grove_list_tasks`, and `grove_list_chats` now support fuzzy matching (substring, word-prefix, and initials) instead of strict contains
- **MCP: `plan_file` in chat status** — `grove_chat_status` now returns the plan file path for orchestrator agents
- **Web: Read-only observation mode** — when a chat session is owned by another process (e.g., MCP agent), the Web UI enters read-only mode with 5s polling instead of showing an error
- **Web: Take Control button** — reclaim chat ownership from a remote agent directly in the Web UI
- **Web: Message sender labels** — messages sent by orchestrator agents display a sender badge (e.g., "Claude Code (Orchestrator)") to distinguish from user messages
- **`created_by` field for tasks** — tracks whether a task was created by an agent or a user
- **API: `/api/v1/read-file`** — new endpoint for reading `.md` files by absolute path (used by Plan panel)

### Fixed

- **Web: code block splitting in diff preview** — prevented code blocks from being split across chunks; unified line-level coloring
- **Web: auto-collapse panels on input expand** — Todo and Plan panels automatically collapse when the input area is expanded to keep bottom buttons visible
- **Web: chat deletion cleanup** — deleting a chat now removes the per-chat data directory and socket file, not just the `chats.toml` entry
- **Web: Blitz mode UX** — removed unnecessary polling, fixed mode switch issues, added dirty branch confirmation dialog
- **Web: auto-save notes on navigation** — notes are now saved automatically when navigating away during editing
- **Web: Blitz mode projectId passthrough** — GitTab, NotesTab, and CommentsTab now receive correct projectId in Blitz mode
- **MCP+ACP: chat message duplication** — fixed flaky MCP tests and ACP chat message duplication bug
- **MCP: planning vs execution tool clarity** — improved tool descriptions and categorization for task context filtering
- **ACP: mode tracking from SetMode commands** — `current_mode_id` is now updated from user SetMode commands (not just agent notifications) and emits `ModeChanged` events for frontend/history consistency
- **Code Review fixer** — fixed review comment resolution workflow

### Changed

- **Web: renamed Plan → Todo, Plan File → Plan** — the structured checklist from ACP Plan notifications is now called "Todo"; the new markdown plan file panel is called "Plan" with a `BookOpen` icon

## [0.7.4] - 2026-02-26

### Added

- **Web: @ file mention in Review comments** — type `@` to reference files in code review comments, with autocomplete dropdown
- **Web: Chat chip UX improvements** — better interaction for ACP Chat tool content chips

### Fixed

- **Web: Info Panel overflow** — long commit messages and branch names no longer stretch the panel beyond its container; added `min-w-0` to flex parent containers in Zen and Blitz modes
- **Web: Info Panel header simplified** — removed Chat/Terminal/Review/Editor buttons from header (both desktop and mobile); Workspace button is the entry point
- **Web: commit messages wrap** — Git tab commit messages now wrap instead of truncating, showing full content
- **Web: ACP Chat tool content rendering** — improved display of tool use results in Chat panel
- **Web: Code Review file ordering** — consistent file ordering and scroll position tracking when switching between files
- **Web: smooth crossfade on task switch** — Blitz/Zen mode now uses smooth crossfade animation when switching between tasks
- **Autolink symlinks** — excluded from git tracking, Editor file tree, and Code Review
- **Panic handling** — spawned threads (ACP session, merge, file watcher) wrapped with `catch_unwind` to log panics instead of silently crashing; bare `unwrap()` replaced with descriptive `expect()` messages; `RUST_BACKTRACE=1` enabled by default

## [0.7.3] - 2026-02-25

### Added

- **Remote access (`grove mobile`)** — access Grove from your phone, tablet, or any device on the network
  - HMAC-SHA256 request signing — secret key never travels over the wire, each request independently signed with timestamp + nonce
  - Nonce-based replay prevention with ±60s timestamp window
  - `--tls` flag for self-signed certificate HTTPS encryption
  - `--cert`/`--key` flags for user-provided CA-signed certificates
  - `--host` flag to bind to a specific address, `--public` to bind to all interfaces
  - QR code printed in terminal — scan to connect instantly with embedded secret key
  - AuthGate component for secret key extraction and HMAC verification
  - Pure JS SHA-256 fallback for HTTP non-localhost contexts where Web Crypto API is unavailable
- **Docs: "Access Remotely" section** — added to landing page and README with security mode explanations
- **`grove tui` subcommand** — explicit command to launch the TUI, same as previous `grove` (no args) behavior
- **Smart launch mode resume** — `grove` (no args) now replays the last used launch mode (`tui`/`web`/`gui`/`mobile`) with all its arguments; defaults to TUI on first run

## [0.7.2] - 2026-02-24

### Added

- **Web: Project selector improvements** — better UX for projects with long or similar names
  - Wider dropdown width (`w-72`/`max-w-sm`) to show more of long project names
  - Middle truncation for project names: splits at separator near midpoint so both start and end are visible (e.g. `open_solu...video_sync`)
  - Type-to-filter search input with auto-focus when dropdown opens
  - Tooltip (`title` attribute) on project items to show full name on hover
  - Applied to both expanded and collapsed sidebar states
- **Web: @ file mention enhancements** — folders, path fixes, Notes support, and Shift+Tab mode cycling
- **Native macOS notifications** — uses `UNUserNotificationCenter` with custom Grove icon, replacing deprecated `NSUserNotification`

### Fixed

- **ACP: Chat history real-time persistence** — write chat history to disk in real-time instead of buffering per turn
- **ACP: Cancel timeout and history compact** — fixed cancel timeout, file snapshot diff, history compaction, and stderr redirect
- **Web: Terminal resize when tab hidden** — skip terminal resize when FlexLayout tab is hidden, preventing layout issues
- **Web: Tool progress display** — fixed tool progress display, slash menu scroll, and agent filter
- **Web: Escape key in terminal** — prevent Escape key from losing focus in xterm terminal
- **Web: Auto-start sessions** — auto-start terminal and chat sessions, removing the manual start step
- **Web: Project dropdown in collapsed sidebar** — show project dropdown when sidebar is collapsed
- **Duplicate task ID rejection** — reject duplicate task IDs against both active and archived tasks
- **Empty repo error UX** — improved error message for empty repositories with no commits
- **Duplicate task error message** — clearer duplicate task error message, removed symlink logs
- **Squash merge detection** — detect squash merge via diff fallback and block re-merge

## [0.7.1] - 2026-02-22

### Added

- **Homebrew tap** — `brew tap GarrickZ2/grove && brew install grove` now supported
  - Homebrew formula for macOS (ARM/Intel) and Linux (x64/ARM)
  - Release CI auto-updates formula with correct sha256 on each release
- **New brandmark and logo** — redesigned Grove icon and wordmark with theme-aware gradients
  - `GroveIcon` component with layered SVG design (trunk, canopy, accent dot)
  - `GroveWordmark` vectorized "GROVE" text with themed gradient fill
  - Shimmer animation on sidebar logo
- **Skill dialog redesign** — per-agent install/uninstall buttons in Manage Skill dialog
  - Each agent shows individual install state and action button
  - Replaces previous bulk install/uninstall flow

### Fixed

- **YAML block scalars in SKILL.md** — frontmatter parser now handles `>` (folded) and `|` (literal) block scalar syntax correctly
- **Dark theme text in FlexLayout** — overrode CSS variable collision (`--color-text`) that caused invisible text in dark themes
- **Toolbar panel duplication** — toolbar buttons now replace the active tab instead of creating duplicate panels
- **Logo accent not following theme** — G and E detail pieces in the wordmark now use a lighter variant of the theme gradient instead of a fixed gray color

## [0.7.0] - 2026-02-19

### Added

- **Skills management system** — full-stack skill marketplace for AI agents
  - Backend: storage layer, operations module, and REST API handlers for agents, sources, and skill installation
  - Frontend: SkillsPage with Agents, Sources, and Explore tabs
  - Sidebar navigation entry for the Skills page
- **Middle-click to close tabs** — FlexLayout panel tabs can now be closed with a middle mouse click, matching browser tab behavior

### Fixed

- **Notes editor Enter key** — pressing Enter in the Notes textarea now correctly inserts a newline instead of triggering Workspace navigation
- **Notes content lost on refresh** — Notes editing state no longer resets when the project refreshes in the background
- **IME composition conflicts** — Chinese/Japanese input method Enter key no longer triggers hotkeys or sends chat messages prematurely; fixed across global hotkeys, Chat input, chat title rename, and pending message edit
- **Version bump script path** — `bump-version.sh` now correctly targets `tauri.conf.json` instead of the old `src-tauri/tauri.conf.json` path

### Removed

- **UPDATE_NOTIFICATION.md** — removed obsolete documentation file

## [0.6.2] - 2026-02-18

### Fixed

- **Tauri GUI drag-and-drop** — disabled native drag-drop handler on WebviewWindow so HTML5 DnD works correctly; fixes FlexLayout tab dragging and file/image drop into chat input
- **Settings not syncing globally** — config changes in Settings page now refresh the global ConfigContext cache so other pages see updates immediately

### Changed

- **Dead code cleanup** — removed 11 unused files, 2 unused npm dependencies (`@vscode/codicons`, `react-file-icon`), ~30 dead function/component exports, and cleaned up barrel re-exports across the web frontend
- **Version management** — added `scripts/bump-version.sh` to sync version across Cargo.toml, Tauri config, and docs from a single source

## [0.6.1] - 2026-02-18

### Added

- **IDE-level FlexLayout workspace** — multi-panel drag-and-drop layout for the Web UI
  - Integrated TaskInfoPanel tabs (Stats, Git, AI Summary, Notes, Review) into FlexLayout
  - Panel-level fullscreen support
- **Three-state Terminal/Chat UX** — Terminal and Chat panels with independent show/hide toggles and dropdown positioning fix
- **Multimedia content support (ACP)** — image, audio, and resource content blocks in agent chat
- **Agent content adapter** — per-agent tool call content rendering with system-reminder stripping for Claude
- **Agent picker for new chat** — "+" button now opens a dropdown to select which agent to use, with ACP availability detection; unavailable agents are hidden
- **Expandable chat input** — resizable text input area; tab double-click to rename chat

### Fixed

- **Chat connectivity and UI issues** — fixed WebSocket reconnection and various chat panel bugs
- **Terminal session type resolution** — resolve session type from task config instead of multiplexer field

## [0.6.0] - 2026-02-17

### Added

- **Agent Client Protocol (ACP)** — built-in chat interface for AI coding agents
  - Full ACP client implementation with JSON-RPC over stdio (`src/acp/mod.rs`)
  - Real-time streaming of agent messages, thoughts, tool calls, and plan updates
  - WebSocket bridge for live chat in the Web UI (`TaskChat.tsx`)
  - Permission request handling with approve/deny UI
  - `grove acp` CLI for headless agent sessions
- **Multi-chat support** — multiple chat sessions per task
  - Create, rename, delete, and switch between chat sessions
  - Each chat maintains independent conversation history with the agent
  - Chat list sidebar with active session indicator
- **Multi-agent support** — configure and switch between different AI agents
  - Built-in agents: Claude Code, Codex, Aider, Amp, OpenCode
  - Custom agent management: add local (command) or remote (URL) agents
  - Per-chat agent selection with model/mode configuration
  - `CustomAgentModal` for adding/editing/deleting custom agents
- **@ file mentions** — reference files directly in chat input
  - Type `@` to trigger file picker with fuzzy search
  - Selected files are injected as context into the agent prompt
- **Plan panel** — dedicated panel for viewing agent's implementation plan
  - Collapsible plan view alongside chat messages
  - Real-time plan updates during agent execution
- **Chat history persistence** — conversations saved to disk
  - JSONL format with turn-level compaction (merges chunk streams, tool call updates)
  - Automatic replay on WebSocket reconnection
  - Stored in `~/.grove/projects/{project}/tasks/{task_id}/chats/{chat_id}/history.jsonl`
- **Server-side message queue** — pending message queue with pause/resume
  - Messages queued during WebSocket disconnection, replayed on reconnect
  - Concurrent prompt cancellation support
- **Terminal protocol** — shell mode integration for ACP agents
  - Shell mode shortcut for quick terminal access within chat

### Changed

- **Storage layout migrated to task-centric structure** — `grove migrate` command
  - Per-task data consolidated into `tasks/<task-id>/` directories
  - Notes: `notes/<id>.md` → `tasks/<id>/notes.md`
  - Reviews: `review/<id>.json` → `tasks/<id>/review.json`
  - Activity: `activity/<id>.jsonl` → `tasks/<id>/activity.jsonl`
  - Automatic migration on first run, with `storage_version` tracking in config
- **Legacy backward-compat code removed** — cleaned up obsolete compatibility layers
  - Removed `chats_legacy` field and auto-migration from Task struct
  - Removed `location` string fallback from review comment API
  - Removed unused `migrateLayoutConfig` function
  - Removed legacy uppercase pane type colors, unified presets to lowercase

### Fixed

- **New Task dialog field colors** — swapped editable/readonly field colors for correct visual hierarchy

## [0.5.0] - 2026-02-14

### Added

- **AutoLink** — automatic symlink creation for worktrees
  - Symlinks node_modules, IDE configs (.vscode, .idea), and build artifacts (target, dist) from main repo to worktrees
  - Configurable glob patterns with gitignore checking for safety
  - TUI and Web UI configuration panels with preset patterns
  - Significantly reduces setup time for new tasks (no re-install, no re-build)
- **Second reminder for unsubmitted tasks** — additional notification when task remains unsubmitted after archiving
- **Remote branch lazy loading** — on-demand loading of remote branches in Web UI for better performance with large repositories
  - Collapsible remote sections (origin, upstream) with automatic folder expansion
  - Filters invalid remote branch names
  - Auto-updates task target branches when switching in main repo
- **Operation layer refactoring** — unified task operations (create/archive/recover/reset/merge/sync) eliminating TUI/Web duplication
  - New `src/operations/tasks.rs` module as single source of truth
  - 331 lines of duplicate code removed across TUI and Web API
  - Type-safe error handling with existing GroveError/Result

### Fixed

- **Editor file tree refresh** — files now appear/disappear immediately after create/delete operations
  - Includes untracked files (via `git ls-files --others`)
  - Filters out deleted files still in git index
- **Git push upstream** — auto-set upstream when pushing new branches (fixes "no upstream branch" error)
- **Terminal performance** — XTerminal component properly unmounts when hidden, avoiding layout resize overhead
- **Blitz keyboard shortcuts** — Command key state now handled via CSS to prevent text selection loss
- **Archive confirmation UX** — professional wording and improved error messages
  - "Worktree" → "Working tree", clearer warning symbols
  - Unified wording between TUI and Web interfaces
- **Dangerous hotkeys removed** — removed accidental Archive/Clean/Reset hotkeys in Blitz mode
  - 'a' (Archive), 'x' (Clean), 'r' (Reset) removed; require menu access with confirmation
  - Added proper 'r' (Review), 'e' (Editor), 't' (Terminal) shortcuts aligned with TasksPage
- **Context menu positioning** — fixed overflow issues near viewport edges in Editor

### Changed

- **Hooks refactored** — custom hooks architecture in Web frontend eliminates code duplication
  - `useTaskPageState` (~250 lines): page-level state management
  - `useTaskNavigation` (~70 lines): j/k navigation logic
  - `usePostMergeArchive` (~160 lines): post-merge archive workflow
  - `useTaskOperations` (~450 lines): all task Git operations
  - BlitzPage: 1100 → 675 lines (-39%), TasksPage: 1154 → 610 lines (-47%)
- **AutoLink config simplified** — always enabled, always checks gitignore
  - Moved to Development Tools section in Web UI
  - Removed redundant enable/check_gitignore toggles

### Performance

- **Get Project API optimized** — 70% faster with data reuse and parallelization
  - Get Project: 1600ms → 480ms (3.3x faster)
  - Convert to response: 1200ms → 80ms (15x faster)
  - FileChanges struct extended with `files_changed` field for zero-cost file counts
  - Parallel worktree processing using rayon

### Documentation

- **CLAUDE.md** — added Web frontend build requirement documentation
- **MCP config** — updated to `~/.claude.json` path, added CodeX example

### Removed

- **Dead code cleanup** — removed unused Dashboard and TaskDetail components from Web UI

## [0.4.13] - 2026-02-11

### Added

- **Web: Comment filtering in Comments tab** — Filter comments by status (All/Open/Resolved) with Outdated included under Open status
- **Web: File system operations in Editor** — Context menu support for file operations in the Editor mode
- **Web: Review/Editor keyboard shortcuts** — Removed dangerous action hotkeys and added mode-specific keyboard shortcuts

### Fixed

- **Review: Markdown rendering spacing issues** — Unified markdown rendering using MarkdownRenderer component for consistent spacing between Review comments and Notes
  - Removed `white-space: pre-wrap` inheritance from diff table that was preserving markdown source newlines
  - Added `[li>&]:mb-0` to remove margin from paragraphs inside list items
  - Fixed excessive spacing between list items in comments
- **Review: Auto-expand navigation improvements** — Enhanced comment navigation experience
  - Auto-expand collapsed code chunks when navigating to comments
  - Auto-expand collapsed files when navigating to comments
  - Auto-expand comment cards when clicking from Conversation panel
  - Use `end_line` instead of `start_line` for navigation (comments render at end_line)
  - Added retry mechanism for async gap expansion
- **Review: Comment line number clamping** — Comments with line numbers exceeding file length now render at the last line (frontend logic)
  - Properly handles both ADD and DELETE sides
  - Works for all comment statuses (resolved/open/outdated)
  - Pure view layer logic, doesn't modify backend data
- **Review: Outdated comment line number clamping** — Outdated comments now clamp to file's last line when anchor exceeds file length
- **Web: Panel switching optimization** — Improved animation performance and state management for panel transitions
- **Web: Viewed status tracking** — Fixed viewed status tracking for files in All Files mode
- **Review: CSS color variable fix** — Replaced undefined `--color-primary` with `--color-highlight`

### Documentation

- **CLAUDE.md: Web frontend build requirement** — Added documentation for web frontend build process

## [0.4.12] - 2026-02-11

### Added

- **Web: Version update notification** — Web and GUI now show a compact, auto-dismissing notification banner when a new version is available
  - New API endpoint `/api/v1/update-check` reuses TUI's update detection logic
  - 24-hour cache to avoid frequent GitHub API requests
  - Displays in top-center with version info and quick actions
  - Auto-dismisses after 10 seconds, persists dismissal per browser session
  - "View Release" button links to GitHub releases page
  - "Copy Command" button copies install script to clipboard
- **Review: Code search with Ctrl+F** — Full-text code search across diff view with match highlighting
  - Ctrl/Cmd+F opens floating search bar
  - Real-time match counting (e.g., "3/15")
  - Navigate between matches with Enter/Shift+Enter or arrow buttons
  - Works in both syntax-highlighted and plain text code
  - Case-sensitive search toggle
  - Current match highlighted with orange outline
  - Auto-scroll to matches with smooth animation
- **Blitz: Quick task navigation shortcuts** — Hold Command/Ctrl to see numbered badges (1-9,0) on first 10 tasks, press Command+number to instantly select that task
- **Blitz: Drag-to-reorder tasks** — Drag task cards to reorder them in the list
  - Visual feedback during drag (opacity change, border indicator)
  - Custom sort order persists in session state
  - Smooth animations and cursor changes

### Fixed

- **Worktree paths registered as separate projects** — Worktree directories are now properly excluded from project registration, preventing nested project clutter in the projects list
- **Review: Comment collapse button not working** — File-level comment collapse/expand functionality now works correctly with proper state management
- **Review: Outdated comments auto-collapsing** — Changed auto-collapse logic to only affect resolved comments, not outdated ones

## [0.4.11] - 2026-02-09

### Fixed

- **Unified diff multi-line comment button not appearing** — cross-side text selections in unified view now correctly show the comment button (side check restricted to split mode only)
- **Comment author showing "You" instead of git user name** — comment creation and replies now use `git user.name` from worktree config as default author, passed through frontend → API → backend
- **Comment placed at wrong line when anchor text has multiple matches** — `find_anchor()` now collects all matches and picks the one closest to the original line number, preventing relocation to earlier occurrences of common patterns like `if err != nil {`

## [0.4.10] - 2026-02-09

### Fixed

- **MCP review tools missing structured comment IDs** — `grove_read_review`, `grove_add_comment`, and `grove_reply_review` now return structured JSON responses with explicit `comment_id` fields, enabling AI agents to reliably extract IDs and reply to comments
- **Zellij sessions missing environment variables** — Zellij sessions now inject `GROVE_*` env vars via KDL layout `export` prefix in all pane commands
- **Review: Comment Detail Modal not refreshing after reply** — expanded comment now derives from latest comments array by ID, so replies appear immediately
- **Review: Esc key in Comment Detail Modal exiting Review mode** — Esc now uses layered capture-phase handling: closes reply form first, then modal, without propagating to parent

### Added

- **Project name tag** — task headers now display the project name as an inline tag badge next to the task name (TaskInfoPanel, TaskView header, and compact toolbar)

### Changed

- **Blitz mode: removed task float-to-top** — selecting a task no longer reorders the list; tasks stay in their natural sort order
- **Blitz mode: single-click enters terminal** — clicking a task now directly opens the terminal view (previously required double-click)
- **Blitz mode: periodic card sweep effect** — selected task card shows a subtle left-to-right highlight sweep that repeats every few seconds
- **Review: Conversation Sidebar filtered in Changes mode** — comments are now filtered to only show those belonging to files visible in the current diff
- **Review: Conversation Sidebar click behavior** — project comments expand on click; file comments navigate to file; inline comments scroll to the exact line
- **Review: Comment Detail Modal Reply button** — now uses theme highlight color instead of muted gray

## [0.4.8] - 2026-02-08

### Fixed

- **Icon loading race condition** — fixed race condition in app icon extraction caused by shared temp file names
  - Now uses unique temp files (target path + nanoseconds) to prevent conflicts
  - Improved cache naming: uses bundle_id instead of hash for better readability
  - Reduced browser cache from 24h to 5min, added ETag for validation
- **Git commit button** — fixed button that was only showing toast, now properly opens commit dialog
- **Git tab 404 errors** — fixed by checking archived tasks in addition to active tasks
- **Settings accordion behavior** — now properly closes other tabs when opening a new one

### Added

- **VSCode-style file icons** — file tree now uses vscode-icons-js library for proper file type icons
  - Replaced generic colored icons with specific file type icons

### Changed

- **TaskInfoPanel close button** — replaced confusing ArrowLeft icon with X icon for better UX
  - Clearer visual distinction between "close panel" and "collapse panel" actions

## [0.4.7] - 2026-02-08

### Changed

- **MCP `grove_reply_review`** — now only appends reply text, no longer changes comment status; added `author` field support
- **MCP `grove_add_comment`** — switched from `location` string to structured parameters (`file_path`, `start_line`, `end_line`, `content`, `author`)
- **MCP `grove_complete_task`** — description now emphasizes ONLY call when user explicitly requests; never automatically

### Added

- **`update_comment_status()` storage API** — dedicated function for changing comment open/resolved status, separated from reply logic
- **`PUT .../review/comments/{commentId}/status` REST endpoint** — Web UI now uses this dedicated endpoint for Resolve/Reopen actions
- **`updateCommentStatus()` frontend API** — new client function calling the status endpoint

## [0.4.5] - 2026-02-06

### Added

- **Blitz mode** — cross-project Active Tasks aggregation view
  - Aggregates active tasks from all registered projects into a single list
  - Card-style task items with project name badges and code change stats
  - Notification-aware sorting (critical > warn > notice), then by updatedAt
  - Selected task floats to top with smooth layout animation
  - Aurora background effect with slow rotating conic gradient
  - Staggered entrance animation with amber shimmer loading effect
  - Full keyboard shortcut support (j/k navigation, all task actions)
  - Reuses TaskInfoPanel, TaskView, and all dialog components from Zen mode
- **LogoBrand component** — artistic mode indicator replacing plain logo text
  - Zen: Leaf icon with emerald-to-violet gradient, vertical fade transition
  - Blitz: Zap icon with amber accent, horizontal slide, lightning badge on logo
  - Click to toggle between Zen and Blitz modes
- **Mode transition effects** — component-level slide animations between Zen and Blitz

### Fixed

- **Duplicate projects in list** — `load_projects()` now deduplicates by path, keeping the newest entry
- **Infinite API loop on Manage Projects** — prevented re-render cycle caused by `isLoading` state toggling on refresh

## [0.4.4] - 2026-02-06

### Added

- **Hook Inbox** — notification center accessible via Bell icon in web sidebar
  - Popover displays all hook notifications across projects with level icons, timestamps, and messages
  - Click a notification to navigate to the corresponding project + task and auto-dismiss
  - Dismiss button (×) on each notification for manual clearing
  - Red badge on Bell icon shows unread count (9+ cap)
  - 5-second polling via React context (`NotificationProvider`)
- **Hook message support** — `grove hooks <level> --message "text"` attaches a message to notifications
  - TUI hook config wizard updated with new "Message" input step (4-step flow)
  - Web settings hook config updated with message input field
- **Task notification indicators** — colored dots (red/yellow/blue) next to task names in web task list
  - Clicking a task with a notification auto-dismisses it
- **Hooks REST API** — `GET /api/v1/hooks` lists all notifications, `DELETE /api/v1/projects/{id}/hooks/{taskId}` dismisses one
- **Enhanced hooks storage** — `HookEntry` model with `level`, `timestamp`, and optional `message`
  - Backward-compatible deserialization: old format (`task = "notice"`) parsed alongside new table format

## [0.4.3] - 2026-02-05

### Added

- **Monaco Editor panel** — new "Editor" button in Task view opens an embedded code editor
  - File tree sidebar (250px) built from `git ls-files`, with expandable directories
  - Monaco Editor with syntax highlighting and auto language detection (30+ languages)
  - `Cmd/Ctrl+S` to save files directly to the worktree
  - File read/write API with path traversal protection (`GET/PUT /api/v1/.../file?path=...`)
- **Editor button in Info panel** — click "Editor" from task details to enter terminal mode with editor open

### Changed

- **Toolbar action reorder** — Git actions (Commit, Rebase, Sync, Merge) now appear first, panel actions (Review, Editor) follow, in both Info panel and Terminal toolbar
- **Editor/Review mutual exclusion** — opening one panel automatically closes the other; terminal collapses for both

## [0.4.2] - 2026-02-05

### Added

- **Zellij multiplexer support** — use Zellij as an alternative to tmux for terminal sessions
  - Global multiplexer config in `config.toml` (`multiplexer = "tmux"` or `"zellij"`)
  - Per-task multiplexer tracking — each task records which multiplexer created it
  - Session dispatcher (`src/session/mod.rs`) routes all operations to tmux or zellij
  - Zellij session lifecycle: create (via `-s -n` layout), attach, kill, exists check
  - KDL layout generation for all presets (single, agent, agent-shell, 3-pane, custom)
  - ANSI-stripping for `zellij list-sessions` output parsing
  - Cleanup of EXITED sessions via `delete-session` before re-creation
  - Monitor mode: Leave shows toast with `Ctrl+o → d` hint (no programmatic detach API)
  - Monitor mode: Exit properly kills zellij session via dispatcher
- **TUI multiplexer selector** — new Config Panel step for choosing tmux/Zellij
  - Shows install status for each option, prevents selecting uninstalled multiplexer
- **Web multiplexer selector** — integrated into Environment settings
  - Dependency list split into base deps and multiplexer section with divider
  - Click tmux/zellij row to switch, "Active" badge on current selection
- **Environment check updated** — requires at least one of tmux or zellij installed

## [0.4.1] - 2026-02-05

### Added

- **Grove GUI (macOS)** — native desktop application using Tauri 2 WebView
  - `grove gui` launches a native desktop window sharing the same frontend as `grove web`
  - Built as optional Cargo feature (`--features gui`), enabled by default in macOS releases
  - Auto port fallback: if default port is in use, automatically tries the next available port
- **Theme-aware project icons** — project icon colors now adapt to the active theme
  - Ported per-theme accent palettes (10 colors) from TUI to web interface
- **Dynamic version display** — Welcome page now shows version from `Cargo.toml` via `/api/v1/version` endpoint
- **Markdown rendering** — Notes tab now uses `react-markdown` + `remark-gfm` for full GFM support
  - Headings (h1-h6), tables, code blocks, blockquotes, task lists, and more
- **Auto port fallback** — `grove web` and `grove gui` automatically try next port if default is in use (up to 10 attempts)
- **Merge with Notes injection** — task notes are automatically injected into merge commit messages (squash & merge-commit), works across TUI, Web, and MCP
- **File Search Bar** — fuzzy file search in Task Terminal view (`Ctrl+F` to focus)
  - Searches all git-tracked files in the task worktree
  - `Tab` to multi-select files, `Enter` to copy paths to clipboard, `Esc` to close
  - Fuzzy matching with path-segment-aware scoring and match highlighting

### Fixed

- **Git operation buttons blocking UI** — removed full-screen overlay during Pull/Push/Fetch/Commit; buttons now disable individually
- **Notes textarea not expanding** — fixed CSS flex layout issue where edit mode textarea didn't fill available space
- **Projects page navigation lag** — double-clicking a project now navigates instantly (loads details in background)
- **Toast notification position** — moved from top-right (blocking New Task button) to top-center
- **Toolbar dropdown menu clipped** — removed `overflow-hidden` from header container so "..." actions menu renders correctly

### Changed

- **CI/CD: macOS releases now include GUI support** — GitHub Release binaries for macOS (arm64/x86_64) are built with `--features gui`, providing TUI + Web + GUI in a single binary
- **Increased minimum GUI window size** — from 1100x700 to 1280x720 to prevent content clipping
- **Removed Welcome page icon glow effect** — cleaner logo appearance

## [0.4.0] - 2026-02-05

### Added

- **Grove Web** — full-featured web interface for managing Grove projects and tasks
  - Built with React + TypeScript + Vite, embedded directly in the binary
  - Dashboard view with repository overview, branch list, commit history
  - Projects page for managing multiple git repositories
  - Tasks page with full task lifecycle management (create, archive, recover, delete)
  - Integrated web terminal via WebSocket (xterm.js)
  - Git operations UI: branches, checkout, pull, push, fetch, stash
  - Code review integration with difit status and comments display
  - Task stats visualization with activity timeline
  - Dark/light theme support with multiple color schemes
- **`grove web` CLI** — start the web server (`grove web` or `grove web --port 3001`)
  - Auto-builds frontend on first run if needed
  - Embeds static assets via `rust_embed` for single-binary deployment
- **Web API** — comprehensive REST API (Axum-based)
  - `/api/projects` — list, add, delete projects
  - `/api/projects/{id}/tasks` — full CRUD + archive/recover operations
  - `/api/projects/{id}/tasks/{id}/sync`, `/commit`, `/merge`, `/reset`, `/rebase-to`
  - `/api/projects/{id}/git/*` — branches, commits, checkout, pull, push, fetch, stash
  - `/api/projects/{id}/tasks/{id}/difit` — code review server integration
  - `/api/projects/{id}/tasks/{id}/stats` — task activity statistics
  - `/api/terminal` — WebSocket terminal for interactive shell access
  - `/api/config` — global configuration management
- **`grove fp` CLI** — interactive file picker using fzf
  - Tab to multi-select, Enter to copy path, Ctrl-O to open file
  - Requires fzf to be installed
- **FilePicker pane role** — available in Custom Layout builder for agent workflows
- **Rebase to target branch** — new action in Tasks page to rebase worktree onto target
- **Task count in Branch Drawer** — Dashboard shows number of tasks per branch

### Fixed

- **File watcher path mismatch** — fixed issue where file activity tracking could miss edits due to path normalization differences

## [0.3.1] - 2026-02-03

### Added

- **MCP Server** — Model Context Protocol server for AI agent integration (`grove mcp`)
  - `grove_status` — check if running inside a Grove task, get task context
  - `grove_read_notes` — read user-written task notes
  - `grove_read_review` — read code review comments with IDs and status
  - `grove_reply_review` — batch reply to review comments with resolved/not_resolved status
  - `grove_complete_task` — complete task in one operation (commit → rebase → merge)
- **Review Comments System** — enhanced code review workflow
  - Comments parsed from difit's `diff_comments.md` output
  - AI replies stored separately in `replies.json` (preserves original comments)
  - Status tracking: open, resolved, not_resolved
  - Location-based reply matching for comment persistence across re-reviews
- **difit Session Monitor PID** — tracks which Grove process is monitoring each difit session
  - Prevents duplicate monitoring threads on TUI refresh
  - Enables reliable session recovery after Grove restart

### Changed

- **Simplified difit monitoring** — refactored to share code between Project/Monitor modes
  - Extracted `spawn_difit_thread` for code reuse
  - `DifitSession` now has `is_difit_alive()`, `is_being_monitored()`, `needs_reattach()` helpers
- **Streamlined config panel** — removed redundant code paths
- **Streamlined preview panel** — simplified rendering logic

### Removed

- **`grove agent` CLI** — replaced by MCP server tools
  - `grove agent status/summary/todo/notes` removed
  - AI agents should use MCP tools instead
- **`grove init` worktree setup** — GROVE.md injection removed
  - AI integration now handled via MCP environment variables
- **AI data storage** — `ai_data.rs` (summary/TODO) removed, replaced by MCP workflow
- **Legacy diff_comments.rs** — merged into `comments.rs` with enhanced functionality

## [0.3.0] - 2026-02-03

### Added

- **Stats Tab** — 5th sub-tab in preview panel for task activity monitoring
  - File edit heatmap showing top 10 edited files with color gradient
  - Activity timeline with 1-minute granularity, color-coded by intensity
  - Summary section with total edits, files touched, last activity time
- **File Watcher** — background file system monitoring for worktree directories
  - Tracks only git-tracked files (via `git ls-files`) to filter noise
  - Captures direct edits, atomic writes (rename pattern), and AI tool modifications
  - Debounce logic (2 seconds) to deduplicate rapid events
  - Batch processing (100ms batches) for performance optimization
- **Activity Persistence** — edit history stored to disk
  - JSONL format at `~/.grove/projects/<hash>/activity/<task_id>/edits.jsonl`
  - Auto-flush every 30 seconds or every 10 events
  - Memory-limited to 1000 events (older events preserved on disk)
- **Monitor Stats Support** — Stats tab available in Monitor mode
  - Read-only mode loads history from disk without active file watching
  - Refreshable with `r` key to see latest activity

### Changed

- **Diff tab renamed to Review** — better reflects its code review purpose

## [0.2.3] - 2026-02-01

### Fixed

- **Kill tmux session on monitor exit** — tmux session is now properly terminated when exiting the monitor view
- **difit session persistence** — difit review sessions are persisted across monitor restarts

## [0.2.2] - 2026-01-30

### Added

- **Diff Tab** — 4th sub-tab in preview panel for code review comments
  - Displays parsed review comments from difit sessions
  - Scrollable content with file location highlighting
- **Background difit execution** — `d` key launches difit in background thread
  - TUI stays responsive during review (no suspend/resume)
  - Diff tab shows spinner banner ("Reviewing in difit...") while active
  - Auto-saves comments and switches to Diff tab on completion
  - Prevents duplicate launches with toast notification
- **Review action in Monitor sidebar** — GROVE ACTIONS → Edit group
- **Review action in Action Palette** — available via Space in Project mode
- **Action group colors** — Monitor sidebar actions color-coded by group
  - Git: green, Edit: blue, Task: yellow, Session: red
- **Action Palette grouping** — actions separated by group with empty lines
  - Group-specific highlight colors when selected
- **Dynamic Action Palette height** — adapts to action count and screen size
- **Scrollable Action Palette** — selection-following scroll on small screens
- **Scrollable Monitor sidebar** — virtual-row scroll for GROVE ACTIONS

### Fixed

- **Custom layout pane assignment bug** — nested splits assigned commands to wrong panes. `list_pane_ids().last()` assumed creation order, but tmux returns layout order. Fixed by diffing pane sets before/after split
- **difit output always empty** — `Stdio::null()` on stdin caused difit to exit immediately; removed stdin null to let difit run normally
- **Stale diff comments after re-review** — always overwrite saved comments file, even when review produces no comments

## [0.2.1] - 2026-01-30

### Added

- **Custom Layout Builder** — recursive wizard for building arbitrary tmux pane layouts
  - Binary tree model: Split (H/V) as internal nodes, Pane (Agent/Grove/Shell/Custom) as leaves
  - Up to 8 panes per layout, split options auto-disable at capacity
  - Esc to backtrack through the build path, auto-advance on leaf assignment
  - Custom command input for arbitrary pane commands
  - Persisted as JSON tree in `config.toml` under `[layout.custom]`

### Fixed

- **Selection index out-of-bounds after task clean** — after cleaning a task, all actions (archive, clean, sync, merge, etc.) would stop working until restart. Fixed by clamping the list selection index in `ensure_selection()`

## [0.2.0] - 2026-01-28

### Added

- **AI Agent Integration** — `grove agent` CLI subcommand for AI-managed task workflows
  - `grove agent status` — check if running inside a Grove-managed task
  - `grove agent summary` — read/write cumulative task summaries
  - `grove agent todo` — read/write TODO lists with done tracking
  - `grove agent notes` — read user-provided task notes
- **Grove Init for Worktrees** — automatic AI integration setup on task creation
  - Generates `GROVE.md` workflow guide in each worktree
  - Injects mandatory integration block into `CLAUDE.md` / `AGENTS.md`
  - Excludes `GROVE.md` from git tracking via `.git/info/exclude`
- **AI Data & Notes Storage** — persistent storage for agent summaries, TODOs, and notes
  - Stored under `~/.grove/projects/<hash>/ai/<task_id>/`
  - Notes stored under `~/.grove/projects/<hash>/notes/<task_id>.md`
- **Preview Panel** — side panel showing task details (Git info, AI summary, notes)
  - Scrollable content with `j/k` keys
  - Sub-tabs: Git, AI Summary, Notes
  - External notes editor support (`$EDITOR`)
  - Auto-refresh on periodic data reload
  - Now opens by default
- **Workspace Card Grid** — redesigned workspace project list
  - Card-style grid layout with gradient color blocks
  - Theme-aware accent color palette (10 colors per theme)
  - Smart path compression for long paths
  - Grid navigation with arrow keys, scrolling support
- **Terminal Tab Title** — sets terminal tab name based on context
  - Workspace mode: "Grove"
  - Project mode: "{project_name} (grove)"
  - Restores default on exit
- **Theme Color Palettes** — per-theme accent palettes for workspace cards
  - Each of the 8 themes defines a unique 10-color gradient palette
  - Card backgrounds palette added to ThemeColors

### Changed

- Stronger CLAUDE.md/AGENTS.md injection — mandatory first-step instruction replaces conditional check
- Preview panel opens by default when entering Project view
- Git helpers: added `recent_log`, `diff_stat`, `uncommitted_count`, `stash_count`
- Fixed merged status detection: use `commits_behind` instead of `commits_ahead`
- Improved AI tab message for legacy tasks without integration
- Footer shortcuts updated for panel navigation
- Theme-aware toast rendering (uses ThemeColors instead of hardcoded colors)
- Extracted shared `truncate()` helper to `components/mod.rs`

## [0.1.6] - 2025-01-27

### Changed

- Simplify hook notification cleanup: clear on tmux detach instead of checking client attachment
- Branch names now limited to 3 words with a 6-digit hash suffix to prevent collisions
- Reduce event poll interval from 100ms to 16ms for lower input latency

### Removed

- `has_client_attached` tmux check (replaced by detach-based cleanup)

## [0.1.5] - 2025-01-18

### Fixed

- New tasks incorrectly showing as "Merged" status when branch and target point to the same commit

## [0.1.3] - 2025-01-16

### Added

- Version display in help panel with update status indicator
- Update checking via GitHub API (24-hour cache)
- Installation method detection (Cargo/Homebrew/GitHub Release)
- Reset action for Current/Other tabs (rebuild branch & worktree from target)

### Changed

- Removed Merge action from Other tab (requires checkout to target first)
- Linux builds now use musl for better compatibility on older systems

### Fixed

- GLIBC compatibility issue on Debian/older Linux distributions

## [0.1.2] - 2025-01-16

### Added

- Startup environment check for git and tmux 3.0+
- Auto-refresh every 5 seconds + manual refresh with `r` key
- Diff colors in worktree list and workspace detail (+green/-red)
- Support for `terminal-notifier` for better notification experience

### Changed

- Simplified branch name generation: default `grove/` prefix, user-defined prefix with `/`
- Improved notification message format: `[project] task name`
- Hook CLI now requires all environment variables before triggering
- Wider task name column in workspace detail view

### Fixed

- Use FNV-1a hash algorithm for deterministic project keys
- Hooks storage now uses project_key consistently
- Removed unused `is_clean()` and `display()` methods

## [0.1.1] - 2025-01-15

### Fixed

- Tab filtering and UI improvements
- Correct rust-toolchain in release.yml
- Correct install.sh URL branch name (main -> master)
- Resolve clippy warnings
- Apply rustfmt formatting

## [0.1.0] - 2025-01-14

### Added

- Initial release
- TUI for managing Git worktrees + tmux sessions
- Workspace view (multi-project) and Project view (single repo)
- Task creation, archiving, and deletion
- tmux session management (create, attach, kill)
- 8 color themes
- Hook notification system (notice, warn, critical)
