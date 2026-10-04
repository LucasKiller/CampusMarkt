# Design

Add one pure path-to-public-URL function under the listing module. Keep Storage paths in the API and database; resolve them only for display. Apply the function to existing photo renderers, including the two owner views using the nonexistent preview route. Preserve existing absolute image URLs used by legacy/demo data. Do not introduce another proxy endpoint.
