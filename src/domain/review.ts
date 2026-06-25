/**
 * The review status every authored graph element carries (ADR-0004, CONTEXT.md
 * "Accept-gate"). An element enters as `proposed` and the Admin moves it to
 * `accepted` or `rejected`; only `accepted` elements reach the preview and,
 * later, a published snapshot. Manual authoring stands in for AI-generated
 * proposals for now, so the gate is exercised before generation lands.
 */
export type ReviewStatus = 'proposed' | 'accepted' | 'rejected'
