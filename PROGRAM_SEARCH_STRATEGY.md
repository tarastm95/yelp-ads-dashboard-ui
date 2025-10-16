# Program Search Strategy When API Lacks Business Sorting

This document captures a recommended approach for supporting the UI's advanced program search when the Partner API does not expose native filtering by business.

## Proposed Runtime Flow

1. **Paginated hydration**
   * Fetch paginated program data from `GET /programs/v1` using the requested lifecycle `program_status` filter, respecting the `offset` and `limit` window returned by the API.
   * Continue paging until either all records are fetched or the UI has collected enough results to satisfy the current search window.
2. **In-memory filtering**
   * Build a normalized collection keyed by `program_id` with a nested set of `businesses` and their `yelp_business_id` values.
   * Apply the UI filters in memory:
     * Program Status – filter directly via the API query parameter.
     * Business – filter locally by matching `yelp_business_id` (or `partner_business_id` when present).
     * Program Type – filter locally against `program_type`.
3. **Caching for responsiveness**
   * Cache the hydrated pages per `(program_status, limit)` tuple for several minutes so that subsequent filters within the UI session reuse local data instead of re-requesting the API.
   * Evict cache entries when the user changes the status or after a TTL to avoid showing stale lifecycle changes.
4. **Incremental updates**
   * While the user adjusts filters, reuse the cached dataset and simply re-run the in-memory filter pipeline, which provides near-real-time feedback.
   * Trigger background refreshes (e.g., on an interval or when the user clicks "Sync with Yelp") to reconcile with authoritative data.

## Handling Large Result Sets

* Consider chunking the hydration using `Promise.all` / concurrency pools to keep total load time low without overwhelming the API (e.g., 3–5 parallel pages).
* If the total size grows beyond what the client can hold, push the pagination+filtering responsibility to a backend endpoint that mirrors the strategy above and streams paginated results back to the UI.

## Error and Rate Limiting Considerations

* Expose loading states while pages hydrate and surface API errors with actionable messages.
* Back off and retry with exponential delays when the Partner API throttles requests.

## Example Prompt for GPT-5 Codex

```
You are GPT-5 Codex helping with a React + TypeScript + React Query front-end.
Implement advanced filtering for the Program Search view using local data because the Yelp Partner API cannot filter by business.

Requirements:
1. Fetch all pages for the selected program status using the existing `usePrograms` hook (or create a new hook if needed).
2. Normalize results into an array of `{ program, businessIds }` where `businessIds` includes both `yelp_business_id` and `partner_business_id` (when present).
3. Implement memoized selectors that filter by:
   * Selected business IDs
   * Program type list
   * Program status (already reflected in the API request)
4. Ensure the filter updates without an additional API call when the user changes Business or Program Type.
5. Add caching so that switching between statuses reuses previously fetched pages for the next 5 minutes.
6. Write unit tests covering the filtering logic (use existing testing setup).
```

This flow keeps the UI responsive while honoring the current Partner API limitations.
