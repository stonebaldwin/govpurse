type Json = Record<string, unknown>;

/** Renders a JSON-LD <script> for structured data (SEO rich results). */
export function JsonLd({ data }: { data: Json | Json[] }) {
  return (
    <script
      type="application/ld+json"
      // Server-rendered from trusted, app-controlled data only.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
