# CVIDEO Data Model Contract v1.0

Status: DRAFT BUILDER CONTRACT
Database: PostgreSQL via Drizzle

## Modeling rules
- UUID/opaque identifiers preferred for externally exposed records.
- Timestamps stored in UTC.
- Soft delete only where business/audit requirements justify it; do not add everywhere by habit.
- Company-owned business records carry `company_id` or derive it through an unambiguous parent relationship.
- Unique/foreign-key/check constraints enforce invariants where practical.
- Migrations are deterministic and reviewed.
- Never store raw passwords, secrets or provider tokens in plaintext.

## Identity
### users
- id
- email unique
- password_hash
- role enum/reference
- status
- locale
- created_at
- updated_at

### sessions
Security-gated.
- id
- user_id
- token/session digest or server-session identifier
- device metadata where approved
- expires_at
- revoked_at
- created_at

## Candidate
### candidate_profiles
- user_id PK/FK
- first_name
- last_name
- photo_key/url reference
- country_code
- city
- primary_category_id
- primary_subcategory_id
- professional_summary
- years_experience
- availability_status
- visibility_status
- created_at
- updated_at

### candidate_subfields
- id
- candidate_user_id
- subcategory_id
- position/order
Constraint: maximum two extra subfields beyond primary profile subcategory enforced in service and tested.

### candidate_preferred_roles
- id
- candidate_user_id
- job_title_id
- order
Constraint: maximum five active rows per candidate.

### candidate_skills
- candidate_user_id
- skill_id
- optional proficiency metadata only if explicitly approved later
Unique candidate + skill.

### candidate_experiences
- id
- candidate_user_id
- company_name
- title
- country_code optional
- city optional
- start_date
- end_date nullable
- is_current
- description nullable
- created_at
- updated_at

### candidate_education
- id
- candidate_user_id
- institution
- degree
- field_of_study nullable
- start_date nullable
- end_date nullable
- description nullable

### candidate_languages
- id
- candidate_user_id
- language_code/reference
- proficiency nullable

### candidate_certificates
- id
- candidate_user_id
- name
- issuing_organization
- issue_date nullable
- expiry_date nullable
- credential_id nullable
- credential_url nullable
- attachment_key nullable
- created_at
- updated_at

### candidate_cv
- candidate_user_id PK/FK
- file_key
- original_filename
- mime_type
- size_bytes
- created_at
- updated_at

### candidate_videos
One active/current introduction video per candidate in v1; historical replacement strategy may retain old media internally if needed.
- id
- candidate_user_id
- provider
- provider_asset_id nullable
- source_key nullable
- playback_key/url reference nullable
- thumbnail_key/url reference nullable
- duration_seconds nullable
- status enum: pending/uploading/processing/ready/rejected/failed
- rejection_reason nullable
- created_at
- updated_at
- replaced_at nullable

## Company and members
### companies
- id
- name
- country_code
- city
- commercial_registration_number
- industry
- company_size nullable
- website nullable
- logo_key nullable
- description nullable
- status
- created_at
- updated_at

### company_members
- id
- company_id
- user_id
- role enum: company_owner/company_admin/recruiter
- status
- created_at
Unique active company + user relationship according to membership policy.

### company_verifications
- id
- company_id
- submitted_by_user_id
- status: pending/approved/rejected
- commercial_registration_number snapshot/reference
- document_key nullable when document verification is enabled
- reviewed_by_admin_user_id nullable
- reviewed_at nullable
- rejection_reason nullable
- created_at
- updated_at

## Discovery
### candidate_view_events
- id
- candidate_user_id
- company_id
- viewer_user_id
- viewed_at
- optional session/dedupe key
Used for product analytics/watch count. Privacy/deduplication policy must be frozen before public counts are finalized.

Search itself should initially be query-driven from indexed candidate profile/taxonomy fields; do not create ATS/application records.

## Saved Lists
### saved_lists
- id
- company_id
- name
- created_by_user_id
- created_at
- updated_at

### saved_list_candidates
- saved_list_id
- candidate_user_id
- saved_by_user_id
- created_at
Unique list + candidate.

## Messaging
### conversations
- id
- company_id
- candidate_user_id
- initiated_by_company_user_id
- created_at
- updated_at
Constraint: initiation is company-side only at service/API boundary. Optional uniqueness rule for one active conversation per company/candidate should be decided before migration freeze.

### messages
- id
- conversation_id
- sender_user_id
- body
- created_at
- edited_at nullable if editing is later supported
No public exposure. Participant authorization is required for reads/writes.

## Interviews
### interview_requests
- id
- company_id
- candidate_user_id
- requested_by_user_id
- conversation_id nullable
- opportunity_title
- starts_at_utc
- timezone
- duration_minutes
- meeting_type: google_meet/video_call/in_person
- message nullable
- location nullable
- status: pending/accepted/time_suggested/declined/cancelled
- accepted_at nullable
- declined_at nullable
- cancelled_at nullable
- created_at
- updated_at

### interview_time_suggestions
- id
- interview_request_id
- suggested_by_user_id
- starts_at_utc
- timezone
- message nullable
- created_at

### interview_meetings
Provider-specific integration record separated from business request.
- id
- interview_request_id
- provider
- external_event_id nullable
- external_meeting_id nullable
- join_url nullable
- provider_status nullable
- created_at
- updated_at

Provider credentials/tokens do not belong here unless encrypted/secrets architecture explicitly approves a secure storage model.

## Taxonomy
### categories
- id
- code unique
- name_en
- name_ar
- active
- sort_order

### subcategories
- id
- category_id
- code unique
- name_en
- name_ar
- active
- sort_order

### job_titles
- id
- code unique
- name_en
- name_ar
- optional category/subcategory relation if taxonomy model requires it
- active

### skills
- id
- code unique
- name_en
- name_ar
- active

### languages
- code PK
- name_en
- name_ar
- active

Countries may use a maintained ISO-backed config/table rather than an invented country model.

## Administration and audit
### audit_events
- id
- actor_user_id nullable
- actor_role
- company_id nullable
- action
- entity_type
- entity_id nullable
- metadata_json with sensitive-data minimization
- ip/user-agent metadata only according to privacy/security policy
- created_at

High-impact actions to audit include company verification decisions, admin moderation, role/member changes, security/session events where appropriate, and destructive actions.

## Indexes
Builder should define indexes from actual query patterns, especially:
- candidate country/city/category/subcategory/years experience/availability
- join indexes for preferred roles and skills
- saved_lists company_id
- conversations company_id and candidate_user_id
- messages conversation_id + created_at
- interviews company_id/candidate_user_id/status/starts_at_utc
- company_verifications status

Do not prematurely add vector search or AI embeddings. They are not required for v1.

## Prohibited data-model drift
Do not introduce tables for:
- job applications
- application stages
- talent pipelines
- candidate match scores
- personality/face/voice/emotion scores
- public likes/followers/comments
- creator/influencer metrics
- salary/compensation expectations in v1 unless Product Owner later approves them

## Migration acceptance
Every migration must include an explanation of purpose and rollback/forward-fix considerations. Destructive migrations require explicit human approval before merge. Security-related schema does not authorize security implementation merge by itself.