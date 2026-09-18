# OGroup AI Factory V1

Status: **FROZEN BASELINE**

Reference product: **CVIDEO**

Baseline acceptance:
- Repository CI: green
- Browser QC: green
- Release gate: READY_FOR_OWNER
- Product Owner review: passed
- CVIDEO becomes the V1 reference implementation for Factory behavior

## 1. Mission

The Factory converts product intent into tested, deployed software through a governed chain of specialized agents.

Human responsibility:
- define business intent
- approve product decisions when required
- perform final owner acceptance

Factory responsibility:
- requirements
- architecture
- implementation
- review
- security
- testing
- deployment
- browser QC
- repair
- release evidence
- support
- learning

The owner is not the debugger, CI operator, release engineer, or manual regression tester.

## 2. Governing Principle

A green build is not a green product.

A product advances only when:
1. implementation is complete
2. CI passes
3. deployment is healthy
4. deployed revision is proven
5. Browser QC passes
6. authenticated journeys pass where required
7. no unresolved blocker exists
8. release gate returns READY_FOR_OWNER
9. Product Owner approves

## 3. Factory Agent Roster

### Orchestrator
Owns the complete job.
- creates and tracks work state
- routes work between agents
- enforces the Factory Constitution
- handles retry/escalation
- prevents silent stalls
- decides which agent runs next
- never bypasses release gates

### Lead / Business Agent
Turns a lead or idea into a structured business problem.

Output:
- business objective
- target user
- value proposition
- scope boundaries
- commercial assumptions

### Product / BA Agent
Turns business intent into implementable requirements.

Output:
- actors
- user journeys
- functional requirements
- acceptance criteria
- business rules
- edge cases
- non-goals

### Architecture Agent
Defines the technical design.

Output:
- system architecture
- data model
- API boundaries
- tenancy model
- security boundaries
- integration contracts
- deployment shape

### UI / UX Agent
Defines the interaction model and design system.

Output:
- information architecture
- screen inventory
- state behavior
- responsive behavior
- accessibility constraints
- reusable design components

### Build Agents
Implement scoped work.

Rules:
- work from approved requirements
- smallest safe change
- add tests with behavior
- no direct production approval
- no bypassing security or QC

### Code Review Agent
Checks correctness, maintainability, regressions, and scope.

### Security Agent
Checks:
- authentication
- authorization
- tenant isolation
- IDOR
- secrets
- privilege escalation
- unsafe defaults
- data exposure

### Test Agent
Runs deterministic repository-level validation.

Required classes:
- unit
- integration
- API
- security regression
- critical journey

### Deploy / DevOps Agent
Deploys approved candidates and proves application startup.

Must verify:
- build
- boot
- health endpoint
- required dependencies
- exact deployed revision where supported

### QC Agent
Tests the deployed product as a user.

Required evidence:
- target URL
- tested revision
- authenticated actor state
- browser results
- screenshots/traces where applicable
- release-gate JSON

### Defect Agent
Converts verified QC failures into failure-specific defects.

A defect signature MUST include the normalized failure fingerprint, not only the test title.

### Fix Agent
Repairs one verified defect at a time.

State machine:
QUEUED -> CLAIMED -> REPRODUCED -> PATCHED -> TESTED -> PR_OPEN -> CI -> STAGING -> QC_RETEST -> READY_FOR_OWNER

Rules:
- isolated repair branch
- smallest safe patch
- regression test required
- no Factory-control edits to hide a defect
- no QC disabling
- no assertion weakening
- no secret exposure
- no auth/security bypass
- no self-merge
- no production approval

Maximum automatic attempts: 3.

After 3 unsuccessful attempts:
NEEDS_HUMAN_ENGINEERING

### Release Gate
Produces only:
- BLOCKED
- READY_FOR_OWNER

It never grants production approval.

### Support Agent
Handles post-release incidents, support signals, and operational defects.

### Learning Agent
Converts recurring failures into permanent Factory rules, tests, templates, and agent responsibilities.

## 4. Mandatory Handoffs

Product / BA -> Architecture
Architecture -> UI/UX + Build
Build -> Code Review + Security + Test
Test -> Deploy
Deploy -> QC
QC failure -> Defect Agent
Defect Agent -> Fix Agent
Fix Agent -> independent verification
Verification -> staging
Staging -> QC retest
QC green -> Release Gate
READY_FOR_OWNER -> Product Owner

No agent may skip the next mandatory gate.

## 5. Autonomous Repair Loop

The V1 repair loop is:

QC fails
-> classify infrastructure vs product defect
-> create failure-specific defect
-> build Fix Agent plan
-> READY_TO_CLAIM
-> Fix Agent starts automatically
-> repair branch
-> repair patch
-> regression test
-> CI
-> staging
-> Browser QC
-> READY_FOR_OWNER or retry

Infrastructure failures do not become product defects.

Examples:
- dependency cold start
- CI package-manager outage
- deployment platform outage
- missing provider configuration
- revision mismatch

These route to Factory infrastructure repair instead.

## 6. No-Silent-Stall Rule

Any agent that cannot continue MUST emit one of:
- RETRYABLE
- NEEDS_FACTORY_CONFIGURATION
- NEEDS_HUMAN_ENGINEERING
- BLOCKED_BY_EXTERNAL_SERVICE
- READY_FOR_NEXT_AGENT

An agent may never silently stop at an intermediate state.

## 7. Deployment Rules Learned from CVIDEO

1. Build success does not prove runtime success.
2. Deployment must prove process boot.
3. Health endpoint must be tested.
4. Exact Git revision should be exposed and verified.
5. Dependency readiness may lag application startup.
6. Cold-start-sensitive provisioning requires bounded retry.
7. Staging app changes trigger strict QC.
8. Workflow-only changes do not falsely demand revision equality with an undeployed SHA.
9. Browser QC must distinguish harness defects from product defects.
10. Router and public API contracts require regression tests.

## 8. Defect Identity Rule

Defect identity is derived from:
- browser/project
- scenario
- normalized root failure

It must normalize unstable values such as:
- deployment URLs
- commit SHAs
- UUIDs
- durations

A different root failure must create a different defect identity even if the same scenario fails.

## 9. Provider-Neutral AI Rule

Agent architecture is provider-neutral.

Each AI-powered agent must expose:
- endpoint
- model
- credential reference
- structured input contract
- structured output contract
- timeout
- retry policy
- failure state

No Factory workflow may pretend an AI agent is active unless a real model call is configured and successfully executed.

## 10. Human Authority

The Product Owner retains authority over:
- product direction
- commercial scope
- release approval
- destructive production actions
- irreversible data changes

The Factory may autonomously execute non-destructive engineering work within its guardrails.

## 11. V1 Exit Criteria

Factory V1 is considered technically frozen when:
- agent roster is defined
- handoffs are defined
- release states are defined
- Fix Agent loop is wired
- QC and defect evidence are machine-readable
- no-silent-stall rule exists
- provider readiness is explicit
- CVIDEO passes CI + QC + owner acceptance

These criteria are satisfied by the current CVIDEO baseline.

## 12. V1 Proof Requirement

CVIDEO proves hardening of an existing product.

Factory V1 is not considered commercially proven until Product #2 is built through the Factory from:
1. business intent
2. requirements
3. architecture
4. implementation
5. CI
6. deployment
7. QC
8. repair if needed
9. READY_FOR_OWNER
10. owner acceptance

The next Factory milestone is therefore:

**PRODUCT #2 END-TO-END PROOF**
