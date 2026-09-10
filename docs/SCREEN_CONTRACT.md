# CVIDEO Screen Contract v1.0

Status: DRAFT BUILDER CONTRACT

This document maps approved product behavior to implementation screens. Stitch is the visual reference only. Canonical wording and behavior here override Stitch annotations/sample text.

## Public
### Landing `/`
Purpose: explain reverse employment simply and route candidates/companies into registration.
Required sections: hero, how it works, candidate benefit, company benefit, pricing placeholder only if approved content exists, language switch, login, candidate/company start CTAs.
Do not show fake statistics, salary claims, verified-history claims, Apply, job listings, or ATS language.

### Login `/login`
Role-aware login entry without exposing admin navigation.

### Candidate register `/register/candidate`
Fast registration. Continue into progressive profile onboarding.

### Company register `/register/company`
Account registration followed by company setup.

## Candidate app
Canonical primary navigation: Home | Messages | Profile.

### Home `/candidate/home`
Show profile completeness, Introduction Video status, legitimate watch-count display only after metric policy is frozen, recent company conversations, interview requests, and profile improvement prompts. No jobs or applications.

### Onboarding `/candidate/onboarding`
Progressive steps. Collect the minimum useful identity/professional data first, then skills/preferred roles/experience/certificates/video. Allow save/continue.

### Profile `/candidate/profile`
Video remains prominent. Show professional identity, preferred roles, skills, experience, education, certificates, languages, summary and optional CV.

### Profile edit `/candidate/profile/edit`
Editable canonical profile fields. Enforce max two extra subfields and max five preferred job titles in UI and API.

### Video `/candidate/profile/video`
Upload/replace and preview the 30-second Introduction Video. Display upload/processing/ready/rejected/failed states. Do not call it live, pitch, broadcast, or score it.

### Messages `/candidate/messages`
List only conversations already initiated by a company/recruiter.

### Conversation `/candidate/messages/:conversationId`
Candidate can reply when participant authorization succeeds. Candidate cannot create a new cold conversation.

### Interview `/candidate/interviews/:interviewId`
Display company, opportunity title, date/time/timezone, duration, type and message. Actions: Accept, Suggest Another Time, Decline.

## Recruiter/company app
Canonical primary navigation: Search | Saved Lists | Messages | Company Account.

### Company onboarding `/company/onboarding`
Company name, country, city, commercial registration number, industry, size, website, logo, description and owner/admin contact. No EIN assumption.

### Verification status `/company/verification`
Pending/approved/rejected states according to final verification policy. Do not claim automated verification unless implemented.

### Search `/company/search`
Desktop: preserve filters while results/discovery are visible. Mobile: compact filters and fast transition to discovery.
Filters may include field/category, subcategory, preferred role, skills, experience, certificates, country, city, language and availability.

### Immersive discovery `/company/discover`
Signature experience. Video is the visual hero.
Information priority: Introduction Video, name, professional headline, location, years experience, skills, preferred roles, Save, Chat, Request Interview, Full Profile.
Desktop target: filter/control area + central portrait video + concise candidate/action panel. Mobile target: nearly full-height portrait video with compact identity/skill/actions and swipe/next interaction.
No public social mechanics or match scores.

### Candidate full profile `/company/candidates/:candidateId`
Recruiter-authorized professional profile only. Video more prominent than optional CV. Actions: Save, Chat, Request Interview.

### Saved Lists `/company/saved`
List of company-owned candidate collections. No stages/funnel/pipeline semantics.

### Saved List detail `/company/saved/:listId`
View saved candidates; add/remove candidates, rename/delete list according to permission.

### Messages `/company/messages`
Recruiter/company conversations. Company may initiate a conversation from candidate profile/discovery.

### Conversation `/company/messages/:conversationId`
Normal participant messaging. Link to candidate profile and relevant interview actions where useful.

### Request Interview `/company/interviews/new?candidateId=...`
Fields: opportunity title, date, time, timezone, duration, interview type, optional message. Types: Google Meet, Video Call, In Person. If In Person, allow location. Submission creates request, not an assumed accepted meeting.

### Interview detail `/company/interviews/:interviewId`
Show pending/accepted/time-suggested/declined/cancelled state and provider meeting details only when created/authorized.

### Company Account `/company/account`
Company profile/settings overview.

### Team `/company/account/team`
Owner/admin manages authorized company members according to RBAC. Recruiter cannot silently escalate permissions.

## Admin web
Admin routes are protected and not linked in public/user nav.

### `/admin`
Overview only from real platform data when implemented. No invented metrics in production.

### `/admin/users`
User management within approved admin powers.

### `/admin/candidates`
Candidate moderation/inspection.

### `/admin/companies`
Company management.

### `/admin/verifications`
Review company verification submissions and approve/reject with reason/audit event.

### `/admin/videos`
Moderation states/actions for Introduction Videos. No employment scoring.

### `/admin/taxonomy`
Manage categories, subcategories, job titles, skills and relevant localization labels.

### `/admin/audit`
Read authorized audit activity.

## Responsive behavior
- Desktop target: 1440px reference composition.
- Tablet: 768-1024px adaptive layouts.
- Mobile: native-feeling layouts and 44px minimum touch targets.
- No simple desktop stretching of mobile screens.
- Recruiter discovery must remain fast at every breakpoint.

## Arabic RTL
Every major screen must support Arabic RTL with mirrored directional layout where appropriate, correct icon/chevron direction, readable Arabic typography and locale-aware dates/times. Do not merely set `text-align:right`.

## Shared states
Every data-driven screen must implement relevant loading, empty, error, success, validation and unauthorized/not-found states. Video adds uploading/processing/ready/rejected/failed. Company verification adds pending/approved/rejected. Interview adds pending/accepted/time_suggested/declined/cancelled.

## Screen acceptance
A screen is not complete because it visually matches Stitch. It must also satisfy canonical navigation, product wording, role behavior, API/data contract, responsive behavior, localization and required states.