import type { JsonLdNode } from "@/lib/seo/json-ld";

export default function JsonLd({ nodes }: { nodes: JsonLdNode[] }) {
  return (
    <>
      {nodes.map((node) => (
        <script key={String(node["@type"])} type="application/ld+json">
          {JSON.stringify(node)}
        </script>
      ))}
    </>
  );
}
