# Every generated graph element carries a review status and citations

Authoring is a conversational, incremental build: the generation model proposes
actors and flows one at a time, each enters as *proposed*, and nothing becomes
part of a snapshot until the Admin *accepts* it. Each factual claim must carry a
citation the Admin reviews to confirm it; unsourced claims are flagged.
Citations are stored on every element; surfacing them to viewers is deferred to a
later version.

The product publishes claims about real companies and countries that an LLM
generated, and LLMs assert false things confidently. A one-shot
generate-then-publish flow is a machine for publishing plausible misinformation.
The proposed→accepted gate turns "trust the AI" into "review the AI," and
mandatory citations are the only honest basis for that review — they also seed
the sources for later automated ingestion. This is why every actor and flow has
a status field and a sources field even though viewers don't yet see them; a
future reader should not strip these as unused.
