# CVIDEO

CVIDEO is OGroup's video-first reverse-employment platform.

Candidates build reusable professional profiles centered on a short introduction video. Companies search the talent pool directly, watch candidate videos, save candidates, start conversations, and request interviews. Candidates do not browse vacancies or apply to jobs.

## Governance

This repository contains the CVIDEO application source.

Product rules, architecture governance, design acceptance, QA gates, security review, documentation requirements, and release governance are controlled by the OGroup AI Product Factory:

- Factory repository: `alnatourm/ogroup-ai-factory`
- Product definition: `products/cvideo/`
- Current Factory tracking issue: `ogroup-ai-factory#43`

Generated code is not accepted as product truth. The approved Factory product contract is the source of truth.

## Current status

**Discovery and design baseline.**

No application source has been accepted yet. The next gate is the approved Stitch screen system for web and mobile, followed by architecture freeze and builder handoff.

## Product principle

> Companies search people instead of people searching vacancies.

## Platforms

- Responsive web application
- iOS mobile application
- Android mobile application
- Shared backend API and database

## Languages

- Arabic, RTL
- English, LTR

## Repository rule

No direct production implementation should be merged into `main` unless it has passed the applicable OGroup Factory gates.