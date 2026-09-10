# CVIDEO Agent Rules

All AI builders and reviewers working in this repository must follow the OGroup AI Product Factory governance in `alnatourm/ogroup-ai-factory`.

## Source of truth

Before changing implementation, read the approved CVIDEO product materials under:

`products/cvideo/`

in the Factory repository.

Builder tools may implement the product. They may not redefine it.

## Product invariants

- CVIDEO is reverse employment and video-first candidate discovery.
- Candidates do not browse vacancies or apply to jobs.
- Companies search candidates.
- Company side initiates first contact.
- Recruiters may request/book interviews after discovery.
- Arabic and English are first-class.
- Web and mobile share one backend and database.
- Authorization and company/tenant boundaries must be enforced server-side.
- Do not introduce employment AI scoring from candidate video.

## Evidence rule

Never claim a feature, build, test, or security check passed unless it actually ran or was independently verified.

Use `NOT VERIFIED` when evidence is unavailable.

## Merge rule

Security-boundary changes involving authentication, authorization, tenant isolation, production infrastructure, secrets, or irreversible data operations require explicit human approval before merge.