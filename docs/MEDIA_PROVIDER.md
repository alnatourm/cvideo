# CVIDEO Media Provider Decision

Status: ACTIVE IMPLEMENTATION BASELINE

CVIDEO keeps media behind provider abstractions. The first production video adapter is Bunny Stream because it supports portrait video, provider-side transcoding, configurable output resolutions and a mature Stream API. CVIDEO limits generated video outputs to 720p and does not enable transcription or AI analysis.

## Introduction Video

The candidate Introduction Video remains limited to 30 seconds by the CVIDEO product contract. Upload metadata is validated before provider allocation. Provider metadata is synchronized after upload/processing and any video exceeding the product duration limit is rejected by CVIDEO.

The server owns the Bunny Stream API key. Client applications never receive the provider access key. Initial implementation uses an authenticated server upload relay so the candidate can only upload to their own video asset. A resumable direct-upload mechanism may replace the relay later without changing the application API contract.

Required runtime configuration:

- `BUNNY_STREAM_LIBRARY_ID`
- `BUNNY_STREAM_API_KEY`
- `BUNNY_STREAM_CDN_HOSTNAME` for playback URL generation

No credentials are committed to the repository.

## CV / documents

CV remains optional and secondary to the Introduction Video. Document storage stays behind a separate object-storage adapter. Production object-storage credentials/provider configuration are not frozen by this decision.

## Security

- candidate media routes derive ownership from the authenticated candidate session
- upload metadata is validated before provider calls
- provider credentials remain server-only
- recruiter-facing APIs expose playback URLs/IDs only for discoverable profiles
- raw storage keys and credentials are never returned to recruiters
- media provider failures return explicit errors rather than fabricated success
