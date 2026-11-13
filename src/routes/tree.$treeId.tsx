import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FamilyTreeView } from "@/components/family-tree-view";

export const Route = createFileRoute("/tree/$treeId")({
  head: () => ({
    meta: [
      { title: "Family Tree — Humara Parivar" },
      {
        name: "description",
        content: "Explore, celebrate, and grow your family tree in real time.",
      },
      { property: "og:title", content: "Family Tree — Humara Parivar" },
      { property: "og:description", content: "Rooted in Love, Growing Together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TreeRouteComponent,
});

function TreeRouteComponent() {
  const { treeId } = Route.useParams();
  const navigate = useNavigate();

  return (
    <FamilyTreeView
      treeId={treeId}
      onNavigateHome={() => navigate({ to: "/" })}
    />
  );
}
