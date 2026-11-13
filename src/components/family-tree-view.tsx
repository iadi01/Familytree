import { useEffect, useRef, useState, type CSSProperties } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Heart,
  Search,
  Plus,
  Minus,
  Home,
  UserPlus,
  X,
  Images,
  Users,
  Bell,
  Camera,
  Trash2,
  RotateCcw,
  Sparkles,
  Smartphone,
  Trees as TreeIcon,
  ChevronDown,
  Share2,
  ArrowLeft,
  Check,
} from "lucide-react";
import { familyRoot, firstName, type Member } from "@/lib/family";
import { nanaImg, naniImg, coupleImgs } from "@/lib/avatars";
import { Button } from "@/components/ui/button";
import { Branches, HeartFrame, WoodenSign } from "@/components/family-scenery";
import gardenImg from "@/assets/family-garden.jpg";
import { FamilyPhotoPicker } from "@/components/family-photo-picker";
import {
  subscribeToPhotos,
  subscribeToChildren,
  saveCustomChild,
  removeCustomChild,
  subscribeToCustomBranches,
  saveCustomBranch,
  removeCustomBranch,
  subscribeToDeletedIds,
  markMemberDeleted,
  restoreMember,
  subscribeToTreeMeta,
  createOrUpdateTree,
  type CustomChild,
  type CustomBranch,
  type TreeMeta,
} from "@/lib/firebase";

interface FamilyTreeViewProps {
  treeId: string;
  onNavigateHome?: () => void;
}

function CoupleCard({
  member,
  expanded,
  highlight,
  onToggle,
  onRemove,
}: {
  member: Member;
  expanded: boolean;
  highlight: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="family-couple">
      {onRemove && (
        <button
          type="button"
          className="couple-remove-btn"
          title={`${firstName(member.name)} & ${firstName(member.spouse ?? "")} ko hatayein`}
          aria-label={`Remove ${firstName(member.name)} & ${firstName(member.spouse ?? "")}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 size={12} />
        </button>
      )}
      <Button
        variant="plain"
        size="natural"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${firstName(member.name)} family`}
        className={`couple-button ${expanded ? "is-expanded" : ""} ${highlight ? "is-match" : ""}`}
      >
        <div className="couple-portrait">
          <img
            src={member.img || coupleImgs["g2-0"]}
            alt={`${member.name} and ${member.spouse ?? ""}`}
            width={992}
            height={672}
          />
          <Heart className="couple-heart fill-primary text-primary" size={18} />
        </div>
        <span className="couple-name">
          {firstName(member.name)} & {firstName(member.spouse ?? "")}
        </span>
      </Button>
      <Button
        variant="plain"
        size="natural"
        className="branch-toggle"
        onClick={onToggle}
        aria-label={`${expanded ? "Hide" : "Show"} children of ${firstName(member.name)}`}
      >
        {expanded ? <Minus size={18} /> : <Plus size={18} />}
      </Button>
    </div>
  );
}

function ChildrenPanel({
  member,
  term,
  onAdd,
  onRemoveChild,
}: {
  member: Member;
  term: string;
  onAdd: (name: string) => void;
  onRemoveChild: (childId: string, childName: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  return (
    <div className="children-panel">
      <span className="panel-flowers left">🌿🌸</span>
      <span className="panel-flowers right">🌸🌿</span>
      <h2>
        <span className="text-primary">♥</span> Our Little Stars{" "}
        <span className="text-primary">♥</span>
      </h2>
      <p className="branch-parent-name">
        {firstName(member.name)} & {firstName(member.spouse ?? "")}
      </p>
      <div className="children-list">
        {member.children.length === 0 ? (
          <p className="py-4 text-xs text-muted-foreground">
            Abhi koi bachcha add nahi hua
          </p>
        ) : (
          member.children.map((child) => (
            <div
              id={child.id}
              key={child.id}
              className={`child-person ${term && child.name.toLowerCase().includes(term) ? "child-match" : ""}`}
            >
              <div className="child-portrait">
                {child.img ? (
                  <img
                    src={child.img}
                    alt={child.name}
                    width={816}
                    height={816}
                  />
                ) : (
                  <span className="font-display text-2xl">
                    {firstName(child.name)[0]}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="child-remove-btn"
                title={`${firstName(child.name)} ko hatayein`}
                aria-label={`Remove ${firstName(child.name)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveChild(child.id, child.name);
                }}
              >
                <Trash2 size={11} />
              </button>
              <span className="child-name">{firstName(child.name)}</span>
            </div>
          ))
        )}
      </div>
      {adding ? (
        <form
          className="mt-3 flex gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) {
              onAdd(name.trim());
              setName("");
              setAdding(false);
            }
          }}
        >
          <input
            aria-label="Child name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Naam"
            className="min-w-0 flex-1 rounded-full border border-input bg-card px-3 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            type="submit"
            size="sm"
            className="h-7 rounded-full px-2 text-xs"
          >
            Add
          </Button>
          <Button
            variant="ghost"
            size="natural"
            aria-label="Cancel adding child"
            onClick={() => setAdding(false)}
          >
            <X size={14} />
          </Button>
        </form>
      ) : (
        <Button
          variant="secondary"
          size="natural"
          className="add-child"
          onClick={() => setAdding(true)}
        >
          <Plus size={16} /> Add Child
        </Button>
      )}
    </div>
  );
}

export function FamilyTreeView({ treeId, onNavigateHome }: FamilyTreeViewProps) {
  const isSharma = treeId === "sharma";

  // Responsive mode detection
  const [viewMode, setViewMode] = useState<"mobile" | "tree">("mobile");
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth >= 768) {
        setViewMode("tree");
      } else {
        setViewMode("mobile");
      }
    }
  }, []);

  const [treeMeta, setTreeMeta] = useState<TreeMeta | null>(
    isSharma
      ? {
          id: "sharma",
          name: "Sharma Family Tree",
          rootName: "Nana",
          rootSpouse: "Nani",
          rootRelation: "Grandparents",
          createdAt: Date.now(),
        }
      : null,
  );

  const [open, setOpen] = useState(new Set(isSharma ? ["g2-5"] : []));
  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<
    "story" | "gallery" | "add" | "photos" | null
  >(null);
  const [addTab, setAddTab] = useState<"child" | "branch" | "manage">("child");
  const [copiedLink, setCopiedLink] = useState(false);

  // Firestore sync state
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [customChildren, setCustomChildren] = useState<
    Record<string, CustomChild[]>
  >({});
  const [customBranches, setCustomBranches] = useState<CustomBranch[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Form states
  const [parent, setParent] = useState("root");
  const [newName, setNewName] = useState("");
  const [newChildRelation, setNewChildRelation] = useState("Child");
  const [branchName, setBranchName] = useState("");
  const [branchSpouse, setBranchSpouse] = useState("");
  const [branchRelation, setBranchRelation] = useState("Moushi");
  const [manageQuery, setManageQuery] = useState("");
  const tree = useRef<HTMLDivElement>(null);

  // Listen to Tree Meta
  useEffect(() => {
    const unsubMeta = subscribeToTreeMeta(treeId, (meta) => {
      if (meta) {
        setTreeMeta(meta);
      } else if (isSharma) {
        const defaultMeta: TreeMeta = {
          id: "sharma",
          name: "Sharma Family Tree",
          rootName: "Nana",
          rootSpouse: "Nani",
          rootRelation: "Grandparents",
          createdAt: Date.now(),
        };
        setTreeMeta(defaultMeta);
        createOrUpdateTree(defaultMeta).catch(console.error);
      }
    });
    return () => unsubMeta();
  }, [treeId, isSharma]);

  // Realtime sync from Firebase Firestore
  useEffect(() => {
    const unsubPhotos = subscribeToPhotos((livePhotos) => {
      setPhotos(livePhotos);
    }, treeId);
    const unsubChildren = subscribeToChildren((liveChildren) => {
      setCustomChildren(liveChildren);
    }, treeId);
    const unsubBranches = subscribeToCustomBranches((liveBranches) => {
      setCustomBranches(liveBranches);
    }, treeId);
    const unsubDeleted = subscribeToDeletedIds((liveDeleted) => {
      setDeletedIds(liveDeleted);
    }, treeId);
    return () => {
      unsubPhotos();
      unsubChildren();
      unsubBranches();
      unsubDeleted();
    };
  }, [treeId]);

  const centerTree = (behavior: ScrollBehavior = "smooth") => {
    const element = tree.current;
    if (element)
      element.scrollTo({
        left: (element.scrollWidth - element.clientWidth) / 2,
        behavior,
      });
  };
  useEffect(() => {
    if (viewMode === "tree") {
      centerTree("instant");
    }
  }, [viewMode]);

  const term = query.trim().toLowerCase();

  // Determine base tree structure
  const baseTreeRoot: Member = isSharma
    ? familyRoot
    : {
        id: "root",
        name: treeMeta?.rootName || "Nana",
        spouse: treeMeta?.rootSpouse || "Nani",
        relation: treeMeta?.rootRelation || "Grandparents",
        children: [],
      };

  // Base branches
  const baseBranches: Member[] = isSharma ? familyRoot.children : [];

  // Convert custom branches into Member shape
  const customBranchesFormatted: Member[] = customBranches.map((b) => ({
    id: b.id,
    name: b.name,
    spouse: b.spouse,
    relation: b.relation || "Parivaar",
    img: b.img,
    children: (b.children || []).map((c) => ({
      id: c.id,
      name: c.name,
      relation: c.relation || "Child",
      img: c.img,
      children: [],
    })),
  }));

  // Also convert any children added DIRECTLY to "root" into generation-2 branches
  const rootDirectKids: CustomChild[] = customChildren["root"] || [];
  const rootDirectBranches: Member[] = rootDirectKids.map((c) => ({
    id: c.id,
    name: c.name,
    spouse: undefined,
    relation: c.relation || "Beta / Beti",
    img: c.img,
    children: [],
  }));

  const allBranches = [...baseBranches, ...customBranchesFormatted, ...rootDirectBranches];

  // Filter out any deleted branch or child
  const activeBranches = allBranches
    .filter((member) => !deletedIds.has(member.id))
    .map((member) => {
      const extra = customChildren[member.id] || [];
      const baseKidIds = new Set(member.children.map((c) => c.id));
      const combinedChildren = [
        ...member.children,
        ...extra
          .filter((c) => !baseKidIds.has(c.id))
          .map((c) => ({
            id: c.id,
            name: c.name,
            relation: c.relation || "Child",
            img: c.img,
            children: [] as Member[],
          })),
      ];

      return {
        ...member,
        children: combinedChildren.filter((child) => !deletedIds.has(child.id)),
      };
    });

  const mergedRoot: Member = {
    ...baseTreeRoot,
    name: treeMeta?.rootName || baseTreeRoot.name,
    spouse: treeMeta?.rootSpouse || baseTreeRoot.spouse,
    children: activeBranches,
  };

  const displayRoot: Member = {
    ...mergedRoot,
    children: mergedRoot.children.map((member) => ({
      ...member,
      img: photos[member.id] ?? member.img,
      children: member.children.map((child) => ({
        ...child,
        img: photos[child.id] ?? child.img,
      })),
    })),
  };

  const photoPeople = [
    { id: "nana", name: mergedRoot.name, image: nanaImg },
    { id: "nani", name: mergedRoot.spouse ?? "Nani", image: naniImg },
    ...mergedRoot.children.flatMap((member) => [
      {
        id: member.id,
        name: `${member.name} & ${member.spouse ?? ""}`,
        image: member.img,
      },
      ...member.children.map((child) => ({
        id: child.id,
        name: child.name,
        image: child.img,
      })),
    ]),
  ];

  const changePhoto = (id: string, photo?: string) =>
    setPhotos((previous) => {
      const next = { ...previous };
      if (photo) next[id] = photo;
      else delete next[id];
      return next;
    });

  useEffect(() => {
    if (!term) return;
    const found = mergedRoot.children.find((member) =>
      [
        member.name,
        member.spouse ?? "",
        ...member.children.map((child) => child.name),
      ].some((name) => name.toLowerCase().includes(term)),
    );
    const child = found?.children.find((member) =>
      member.name.toLowerCase().includes(term),
    );
    const target = child?.id ?? found?.id ?? "family-root";
    document.getElementById(target)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [term, open, mergedRoot]);

  const matches = (member: Member) =>
    Boolean(term) &&
    [
      member.name,
      member.spouse ?? "",
      ...member.children.map((child) => child.name),
    ].some((name) => name.toLowerCase().includes(term));

  const toggle = (id: string) =>
    setOpen((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addChild = async (parentId: string, name: string) => {
    if (!name.trim()) return;

    if (parentId === "root") {
      // Adding directly under Nana & Nani (Generation 2)
      const newChild: CustomChild = {
        id: `gen2-${Date.now()}`,
        name: name.trim(),
        relation: newChildRelation || "Beta / Beti",
      };
      try {
        await saveCustomChild("root", newChild, treeId);
        setNewName("");
        setDialog(null);
      } catch (err) {
        console.error("Save root child failed:", err);
        alert("Sadasya add karne me samasya aayi.");
      }
      return;
    }

    const newChild: CustomChild = {
      id: `${parentId}-${Date.now()}`,
      name: name.trim(),
      relation: "Child",
    };
    try {
      await saveCustomChild(parentId, newChild, treeId);
      setOpen((prev) => new Set([...prev, parentId]));
      setNewName("");
      setDialog(null);
    } catch (err) {
      console.error("Save custom child failed:", err);
      alert("Bachha add karne me samasya aayi.");
    }
  };

  const addBranch = async (name: string, spouse: string, relation: string) => {
    if (!name.trim()) return;
    const newBranch: CustomBranch = {
      id: `branch-${Date.now()}`,
      name: name.trim(),
      spouse: spouse.trim() || undefined,
      relation: relation.trim() || "Parivaar",
    };
    try {
      await saveCustomBranch(newBranch, treeId);
      setOpen((prev) => new Set([...prev, newBranch.id]));
      setBranchName("");
      setBranchSpouse("");
      setDialog(null);
    } catch (err) {
      console.error("Save custom branch failed:", err);
      alert("Parivaar branch add karne me samasya aayi.");
    }
  };

  const handleRemoveBranch = async (branchId: string, branchName: string) => {
    const ok = window.confirm(
      `Kya aap sach me "${branchName}" ko hatana chahte hain?`,
    );
    if (!ok) return;
    try {
      if (customBranches.some((b) => b.id === branchId)) {
        await removeCustomBranch(branchId, treeId);
      }
      // If was added directly to root as CustomChild
      if (rootDirectKids.some((c) => c.id === branchId)) {
        await removeCustomChild("root", branchId, treeId);
      }
      await markMemberDeleted(branchId, treeId);
    } catch (err) {
      console.error("Remove branch failed:", err);
      alert("Branch hatane me samasya aayi.");
    }
  };

  const handleRemoveChild = async (
    parentId: string,
    childId: string,
    childName: string,
  ) => {
    const ok = window.confirm(
      `Kya aap sach me "${childName}" ko hatana chahte hain?`,
    );
    if (!ok) return;
    try {
      await removeCustomChild(parentId, childId, treeId);
      await markMemberDeleted(childId, treeId);
    } catch (err) {
      console.error("Remove child failed:", err);
      alert("Bachha hatane me samasya aayi.");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreMember(id, treeId);
    } catch (err) {
      console.error("Restore failed:", err);
      alert("Restore karne me samasya aayi.");
    }
  };

  const copyShareLink = async () => {
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      alert("Link copy nahi ho paaya.");
    }
  };

  const reset = () => {
    setZoom(1);
    if (viewMode === "tree") {
      requestAnimationFrame(() => centerTree());
    }
  };

  const search = (value: string) => {
    setQuery(value);
    const found = mergedRoot.children.find((member) =>
      [
        member.name,
        member.spouse ?? "",
        ...member.children.map((child) => child.name),
      ].some(
        (name) =>
          value.trim() &&
          name.toLowerCase().includes(value.trim().toLowerCase()),
      ),
    );
    if (found) setOpen((previous) => new Set([...previous, found.id]));
  };

  // Compile list of all people for Manage/Remove tab
  const allKnownPeople = [
    ...allBranches.map((b) => ({
      id: b.id,
      name: `${b.name}${b.spouse ? ` & ${b.spouse}` : ""}`,
      relation: b.relation || "Couple",
      img: photos[b.id] ?? b.img,
      type: "branch" as const,
      parentId: "root",
      isDeleted: deletedIds.has(b.id),
    })),
    ...allBranches.flatMap((b) => {
      const extra = customChildren[b.id] || [];
      const baseKidIds = new Set(b.children.map((c) => c.id));
      const combined = [
        ...b.children,
        ...extra.filter((c) => !baseKidIds.has(c.id)),
      ];
      return combined.map((k) => ({
        id: k.id,
        name: k.name,
        relation: `Child of ${firstName(b.name)}`,
        img: photos[k.id] ?? k.img,
        type: "child" as const,
        parentId: b.id,
        isDeleted: deletedIds.has(k.id),
      }));
    }),
  ];

  const filteredManagePeople = allKnownPeople.filter((p) =>
    manageQuery.trim()
      ? p.name.toLowerCase().includes(manageQuery.trim().toLowerCase())
      : true,
  );

  return (
    <div className="family-page">
      <img
        className="garden-background"
        src={gardenImg}
        alt=""
        width={1920}
        height={1088}
      />
      <header className="family-header">
        <div className="flex items-center gap-3">
          {onNavigateHome && (
            <button
              type="button"
              className="hub-back-button"
              onClick={onNavigateHome}
              title="All Trees / Home"
              aria-label="Back to Trees Hub"
            >
              <ArrowLeft size={17} />
              <span className="hidden sm:inline">Hub</span>
            </button>
          )}
          <div className="family-brand">
            <span aria-hidden="true">🌳</span>
            <h1>
              {treeMeta?.name ? (
                <>
                  {treeMeta.name.split(" ")[0]}
                  <br />
                  {treeMeta.name.split(" ").slice(1).join(" ") || "Family Tree"}
                </>
              ) : (
                <>
                  Sharma
                  <br />
                  Family Tree
                </>
              )}
            </h1>
          </div>
        </div>

        {/* View Switcher: Mobile Cards vs Garden Tree */}
        <div className="view-mode-toggle" aria-label="Switch View">
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "mobile" ? "active" : ""}`}
            onClick={() => setViewMode("mobile")}
            title="Mobile Cards View"
          >
            <Smartphone size={15} />
            <span className="text-xs">Cards</span>
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "tree" ? "active" : ""}`}
            onClick={() => setViewMode("tree")}
            title="Garden Tree Canvas View"
          >
            <TreeIcon size={15} />
            <span className="text-xs">Tree</span>
          </button>
        </div>

        <nav className="family-nav hidden md:flex" aria-label="Main navigation">
          {onNavigateHome && (
            <Button
              variant="plain"
              size="natural"
              onClick={onNavigateHome}
            >
              <Home size={17} /> All Trees
            </Button>
          )}
          <Button
            variant="plain"
            size="natural"
            onClick={() => setDialog("story")}
          >
            <Heart size={17} /> Our Story
          </Button>
          <Button
            variant="plain"
            size="natural"
            onClick={() => setDialog("gallery")}
          >
            <Images size={17} /> Gallery
          </Button>
        </nav>

        <div className="family-search">
          <Search size={18} />
          <input
            aria-label="Search family member"
            value={query}
            onChange={(event) => search(event.target.value)}
            placeholder="Search family member..."
          />
          {query && (
            <Button
              variant="plain"
              size="natural"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <X size={16} />
            </Button>
          )}
        </div>

        <button
          type="button"
          className="share-tree-button"
          title="Share Tree Link"
          onClick={copyShareLink}
        >
          {copiedLink ? <Check size={17} /> : <Share2 size={17} />}
          <span className="hidden sm:inline">
            {copiedLink ? "Copied!" : "Share"}
          </span>
        </button>

        <Button
          variant="secondary"
          size="icon"
          className="photo-toolbar-button"
          title="Family Photos"
          aria-label="Family Photos"
          onClick={() => setDialog("photos")}
        >
          <Camera size={20} />
        </Button>

        <Button
          className="add-member"
          onClick={() => {
            setParent("root");
            setAddTab("child");
            setDialog("add");
          }}
        >
          <UserPlus size={18} />
          <span>Add / Manage</span>
        </Button>
      </header>

      {/* Main Content Area */}
      {viewMode === "mobile" ? (
        /* Mobile Card / Directory View */
        <main className="mobile-family-container">
          {/* Roots / Nana & Nani Card */}
          <div className="mobile-roots-card">
            <div className="mobile-roots-header">
              <span className="text-3xl">🌳</span>
              <div>
                <h2 className="text-xl font-bold font-display">
                  {treeMeta?.name || "Humara Parivar"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Our Roots · Our Strength · Our Forever
                </p>
              </div>
            </div>

            <div className="mobile-roots-portraits">
              <div className="mobile-portrait-item">
                <div className="mobile-avatar-frame">
                  <img
                    src={photos["nana"] || nanaImg}
                    alt={mergedRoot.name}
                  />
                </div>
                <span className="mobile-person-name">{mergedRoot.name}</span>
              </div>
              {mergedRoot.spouse && (
                <>
                  <span className="text-2xl text-primary animate-pulse">💗</span>
                  <div className="mobile-portrait-item">
                    <div className="mobile-avatar-frame">
                      <img
                        src={photos["nani"] || naniImg}
                        alt={mergedRoot.spouse}
                      />
                    </div>
                    <span className="mobile-person-name">
                      {mergedRoot.spouse}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Direct Add Member to Nana & Nani Button */}
            <button
              type="button"
              className="mobile-add-root-btn"
              onClick={() => {
                setParent("root");
                setAddTab("child");
                setDialog("add");
              }}
            >
              <Plus size={16} />
              <span>
                {firstName(mergedRoot.name)}-{firstName(mergedRoot.spouse ?? "Nani")} se Sadasya Jodein
              </span>
            </button>
          </div>

          {/* Section Heading */}
          <div className="mobile-section-title">
            <span>🌿</span>
            <h3>Parivaar Branches ({displayRoot.children.length})</h3>
            <span>🌿</span>
          </div>

          {/* List of generation 2 couples / members */}
          <div className="mobile-branches-list">
            {displayRoot.children.length === 0 ? (
              <div className="text-center py-8 bg-card rounded-2xl border p-4 text-muted-foreground text-sm">
                Abhi koi branch add nahi hui hai.
                <br />
                Upar "Nana-Nani se Sadasya Jodein" button dabayein!
              </div>
            ) : (
              displayRoot.children.map((member) => (
                <div key={member.id} className="mobile-branch-card">
                  <div className="mobile-branch-main">
                    <div className="mobile-branch-avatar">
                      <img
                        src={member.img || coupleImgs["g2-0"]}
                        alt={member.name}
                      />
                    </div>
                    <div className="mobile-branch-details">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-sm">
                          {firstName(member.name)}{" "}
                          {member.spouse ? `& ${firstName(member.spouse)}` : ""}
                        </h4>
                        <span className="mobile-relation-pill">
                          {member.relation}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {member.children.length === 0
                          ? "Koi bachha nahi"
                          : `${member.children.length} Little Stars`}
                      </p>
                    </div>

                    <div className="mobile-branch-actions">
                      <button
                        type="button"
                        className="mobile-icon-btn text-destructive"
                        title="Hatao"
                        aria-label="Remove member"
                        onClick={() =>
                          handleRemoveBranch(
                            member.id,
                            `${firstName(member.name)} & ${firstName(member.spouse ?? "")}`,
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        type="button"
                        className={`mobile-expand-btn ${open.has(member.id) ? "open" : ""}`}
                        aria-label="Toggle children"
                        onClick={() => toggle(member.id)}
                      >
                        <ChevronDown size={19} />
                      </button>
                    </div>
                  </div>

                  {/* Expandable kids list */}
                  {open.has(member.id) && (
                    <div className="mobile-branch-kids-container">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Little Stars ({member.children.length}):
                        </span>
                        <button
                          type="button"
                          className="mobile-add-kid-btn"
                          onClick={() => {
                            setParent(member.id);
                            setAddTab("child");
                            setDialog("add");
                          }}
                        >
                          <Plus size={12} /> Bachha Jodein
                        </button>
                      </div>

                      {member.children.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 text-center">
                          Abhi koi bachha add nahi hua
                        </p>
                      ) : (
                        <div className="mobile-kids-grid">
                          {member.children.map((child) => (
                            <div key={child.id} className="mobile-kid-item">
                              <div className="mobile-kid-avatar">
                                {child.img ? (
                                  <img src={child.img} alt={child.name} />
                                ) : (
                                  <span>{firstName(child.name)[0]}</span>
                                )}
                                <button
                                  type="button"
                                  className="mobile-kid-del-btn"
                                  title="Bachha hatayein"
                                  aria-label="Remove child"
                                  onClick={() =>
                                    handleRemoveChild(
                                      member.id,
                                      child.id,
                                      child.name,
                                    )
                                  }
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                              <span className="mobile-kid-name">
                                {firstName(child.name)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      ) : (
        /* Garden Canvas Tree View */
        <main className="family-main">
          <WoodenSign />
          <div className="cloud-message" aria-hidden="true">
            Generations
            <br />
            grow, but love
            <br />
            always stays<span>♥</span>
          </div>
          <div className="floating-heart one" aria-hidden="true">
            ♥
          </div>
          <div className="floating-heart two" aria-hidden="true">
            ♥
          </div>
          <div className="zoom-controls" aria-label="Tree zoom">
            <Button
              variant="plain"
              size="natural"
              title="Zoom in"
              aria-label="Zoom in"
              onClick={() => setZoom((value) => Math.min(1.6, value + 0.1))}
            >
              <Plus size={21} />
            </Button>
            <Button
              variant="plain"
              size="natural"
              title="Zoom out"
              aria-label="Zoom out"
              onClick={() => setZoom((value) => Math.max(0.5, value - 0.1))}
            >
              <Minus size={21} />
            </Button>
            <Button
              variant="plain"
              size="natural"
              title="Reset view"
              aria-label="Reset view"
              onClick={reset}
            >
              <Home size={20} />
            </Button>
          </div>
          <div className="tree-scroll" ref={tree}>
            <div
              className="tree-canvas"
              style={{ "--user-zoom": zoom } as CSSProperties}
            >
              <div id="family-root" className="grandparents">
                <HeartFrame />
                <span className="root-botanical left" aria-hidden="true">
                  🌿<span>🌸</span>🌿
                </span>
                <span className="root-botanical right" aria-hidden="true">
                  🌿<span>🌸</span>🌿
                </span>
                <div className="grandparent-pair">
                  {[
                    {
                      name: mergedRoot.name,
                      img: photos["nana"] ?? nanaImg,
                    },
                    {
                      name: mergedRoot.spouse ?? "Nani",
                      img: photos["nani"] ?? naniImg,
                    },
                  ].map((person) => (
                    <div className="grandparent" key={person.name}>
                      <div
                        className={`grandparent-portrait ${matches(mergedRoot) ? "is-match" : ""}`}
                      >
                        <img
                          src={person.img}
                          alt={person.name}
                          width={816}
                          height={816}
                        />
                      </div>
                      <span>{person.name}</span>
                    </div>
                  ))}
                  <span className="grandparent-love" aria-hidden="true">
                    💗
                  </span>
                </div>
                <div className="roots-ribbon">
                  <span>♥</span> Our Roots <span className="ribbon-dot">·</span>{" "}
                  Our Strength <span className="ribbon-dot">·</span> Our Forever{" "}
                  <span>♥</span>
                </div>

                {/* Direct Add to Roots Button on Canvas */}
                <button
                  type="button"
                  className="roots-canvas-add-btn"
                  title="Add child directly to Nana & Nani"
                  onClick={() => {
                    setParent("root");
                    setAddTab("child");
                    setDialog("add");
                  }}
                >
                  <Plus size={13} />
                  <span>{firstName(mergedRoot.name)}-{firstName(mergedRoot.spouse ?? "Nani")} se Jodein</span>
                </button>
              </div>

              <Branches count={displayRoot.children.length} />

              <div className="couples-row">
                {displayRoot.children.map((member) => (
                  <div id={member.id} key={member.id}>
                    <CoupleCard
                      member={member}
                      expanded={open.has(member.id)}
                      highlight={matches(member)}
                      onToggle={() => toggle(member.id)}
                      onRemove={() =>
                        handleRemoveBranch(
                          member.id,
                          `${firstName(member.name)} & ${firstName(member.spouse ?? "")}`,
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              <div
                className={`expanded-branches ${open.size === 1 ? "single-branch" : ""}`}
              >
                {displayRoot.children
                  .filter((member) => open.has(member.id))
                  .map((member) => (
                    <ChildrenPanel
                      key={member.id}
                      member={member}
                      term={term}
                      onAdd={(name) => addChild(member.id, name)}
                      onRemoveChild={(childId, childName) =>
                        handleRemoveChild(member.id, childId, childName)
                      }
                    />
                  ))}
              </div>
            </div>
          </div>
          <WoodenSign bottom />
          <div className="direction-signs" aria-hidden="true">
            <span>♥ Family ♥</span>
            <span>Memories ♥</span>
            <span>♥ Forever ♥</span>
          </div>
        </main>
      )}

      <footer className="family-footer">
        <h2>{treeMeta?.name || "The Family Tree"}</h2>
        <p>
          Rooted in Love <span>♥</span> Growing Together <span>♥</span> Always Home
        </p>
        <p className="mt-1 text-xs opacity-80">
          Humara Parivar · Crafted with ♥ by Humna
        </p>
      </footer>

      {/* Modal Dialogs */}
      <Dialog.Root
        open={dialog !== null}
        onOpenChange={(value) => {
          if (!value) setDialog(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-backdrop" />
          <Dialog.Content className="family-dialog" aria-describedby={undefined}>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              aria-label="Close"
              onClick={() => setDialog(null)}
            >
              <X size={18} />
            </Button>
            <Dialog.Title className="mb-4 text-2xl font-semibold">
              {dialog === "photos"
                ? "Our Family Photos"
                : dialog === "add"
                  ? "Family Members & Branches"
                  : dialog === "story"
                    ? treeMeta?.name || "The Family Tree"
                    : "Family Gallery"}
            </Dialog.Title>

            {dialog === "photos" ? (
              <FamilyPhotoPicker
                people={photoPeople}
                photos={photos}
                onPhoto={changePhoto}
              />
            ) : dialog === "story" ? (
              <div className="text-center">
                <span className="text-5xl">🌳</span>
                <p className="mt-4 font-semibold text-lg">
                  {mergedRoot.name} & {mergedRoot.spouse || "Nani"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Our Roots · Our Strength · Our Forever
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {mergedRoot.children.map((member) => (
                    <span
                      className="rounded-full bg-secondary px-3 py-1 text-sm"
                      key={member.id}
                    >
                      {firstName(member.name)}{" "}
                      {member.spouse ? `& ${firstName(member.spouse)}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            ) : dialog === "gallery" ? (
              <>
                <Button
                  variant="secondary"
                  className="mb-4"
                  onClick={() => setDialog("photos")}
                >
                  <Camera size={16} />
                  Add Photos
                </Button>
                <div className="grid grid-cols-3 gap-3">
                  {photoPeople.map((person) => (
                    <figure key={person.id}>
                      {photos[person.id] ?? person.image ? (
                        <img
                          src={photos[person.id] ?? person.image}
                          alt={person.name}
                          className="gallery-photo"
                        />
                      ) : (
                        <div className="gallery-photo grid place-items-center bg-secondary">
                          <Camera size={24} />
                        </div>
                      )}
                      <figcaption className="mt-1 text-center text-xs font-medium">
                        {person.name}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </>
            ) : (
              /* Add & Manage Members Dialog */
              <div>
                <div className="dialog-tabs-nav">
                  <button
                    type="button"
                    className={`dialog-tab-btn ${addTab === "child" ? "active" : ""}`}
                    onClick={() => setAddTab("child")}
                  >
                    <Plus size={13} className="inline mr-1" />
                    Bachha / Sadasya Jodein
                  </button>
                  <button
                    type="button"
                    className={`dialog-tab-btn ${addTab === "branch" ? "active" : ""}`}
                    onClick={() => setAddTab("branch")}
                  >
                    <Sparkles size={13} className="inline mr-1" />
                    Naya Dampati (Couple)
                  </button>
                  <button
                    type="button"
                    className={`dialog-tab-btn ${addTab === "manage" ? "active" : ""}`}
                    onClick={() => setAddTab("manage")}
                  >
                    <Trash2 size={13} className="inline mr-1" />
                    Sadasya Hatao ({deletedIds.size > 0 ? `${deletedIds.size} deleted` : "Manage"})
                  </button>
                </div>

                {addTab === "child" ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!newName.trim()) return;
                      addChild(parent, newName.trim());
                    }}
                    className="flex flex-col gap-4"
                  >
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Kiske Parivaar me jodein? (Select Parent)
                      <select
                        value={parent}
                        onChange={(event) => setParent(event.target.value)}
                        className="rounded-lg border bg-card p-3 text-sm outline-none"
                      >
                        {/* Option 1: Direct to Nana & Nani / Roots */}
                        <option value="root" className="font-bold text-primary">
                          🌳 {mergedRoot.name} & {mergedRoot.spouse || "Nani"} (Roots / Nana-Nani)
                        </option>
                        {/* Option 2+: Existing couples */}
                        {mergedRoot.children.map((member) => (
                          <option key={member.id} value={member.id}>
                            {firstName(member.name)}{" "}
                            {member.spouse ? `& ${firstName(member.spouse)}` : ""}{" "}
                            ({member.relation})
                          </option>
                        ))}
                      </select>
                    </label>

                    {parent === "root" && (
                      <label className="flex flex-col gap-2 text-sm font-medium">
                        Rishta (Relation to Roots)
                        <select
                          value={newChildRelation}
                          onChange={(e) => setNewChildRelation(e.target.value)}
                          className="rounded-lg border bg-card p-3 text-sm outline-none"
                        >
                          <option value="Beta">Beta (Son)</option>
                          <option value="Beti">Beti (Daughter)</option>
                          <option value="Mama">Mama / Mami</option>
                          <option value="Moushi">Moushi / Mausa</option>
                          <option value="Chacha">Chacha / Chachi</option>
                          <option value="Bhaiya">Bhaiya</option>
                          <option value="Didi">Didi</option>
                        </select>
                      </label>
                    )}

                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Sadasya / Bachhe ka naam (Name) *
                      <input
                        required
                        value={newName}
                        onChange={(event) => setNewName(event.target.value)}
                        placeholder="Udaharan: Aarav, Rahul, Anaya..."
                        className="rounded-lg border bg-card p-3 text-sm outline-none"
                      />
                    </label>

                    <Button type="submit" className="rounded-full mt-2">
                      <Plus size={16} />{" "}
                      {parent === "root"
                        ? `Nana-Nani se Jodein (Add to Roots)`
                        : `Bachha Jodein (Add Child)`}
                    </Button>
                  </form>
                ) : addTab === "branch" ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!branchName.trim()) return;
                      addBranch(branchName, branchSpouse, branchRelation);
                    }}
                    className="flex flex-col gap-4"
                  >
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Sadasya ka naam (Member Name) *
                      <input
                        required
                        value={branchName}
                        onChange={(event) => setBranchName(event.target.value)}
                        placeholder="Udaharan: Rohan Sharma"
                        className="rounded-lg border bg-card p-3 text-sm outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Pati / Patni ka naam (Spouse Name)
                      <input
                        value={branchSpouse}
                        onChange={(event) => setBranchSpouse(event.target.value)}
                        placeholder="Udaharan: Pooja Sharma"
                        className="rounded-lg border bg-card p-3 text-sm outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Rishta (Relation / Title)
                      <select
                        value={branchRelation}
                        onChange={(event) => setBranchRelation(event.target.value)}
                        className="rounded-lg border bg-card p-3 text-sm outline-none"
                      >
                        <option value="Moushi">Moushi / Mausa</option>
                        <option value="Mama">Mama / Mami</option>
                        <option value="Chacha">Chacha / Chachi</option>
                        <option value="Bhaiya">Bhaiya / Bhabhi</option>
                        <option value="Didi">Didi / Jiju</option>
                        <option value="Beta">Beta / Bahu</option>
                        <option value="Parivaar">Parivaar (Other)</option>
                      </select>
                    </label>
                    <Button type="submit" className="rounded-full mt-2">
                      <Sparkles size={16} /> Naya Parivaar Jodein (Add Branch)
                    </Button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-3">
                    <input
                      value={manageQuery}
                      onChange={(e) => setManageQuery(e.target.value)}
                      placeholder="Sadasya ka naam khojein..."
                      className="rounded-lg border bg-card p-2 text-xs outline-none"
                    />

                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Active Members ({filteredManagePeople.filter((p) => !p.isDeleted).length})
                    </p>

                    <div className="member-manage-list">
                      {filteredManagePeople
                        .filter((p) => !p.isDeleted)
                        .map((person) => (
                          <div key={person.id} className="member-manage-card">
                            <div className="member-manage-info">
                              <div className="member-manage-avatar">
                                {person.img ? (
                                  <img src={person.img} alt="" />
                                ) : (
                                  person.name[0]
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-bold leading-tight">
                                  {person.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {person.relation}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="member-delete-btn"
                              onClick={() => {
                                if (person.type === "branch") {
                                  handleRemoveBranch(person.id, person.name);
                                } else {
                                  handleRemoveChild(
                                    person.parentId,
                                    person.id,
                                    person.name,
                                  );
                                }
                              }}
                            >
                              <Trash2 size={12} />
                              Hatao
                            </button>
                          </div>
                        ))}
                    </div>

                    {deletedIds.size > 0 && (
                      <div className="mt-2 border-t pt-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Hataaye gaye sadasya (Deleted)
                        </p>
                        <div className="member-manage-list">
                          {filteredManagePeople
                            .filter((p) => p.isDeleted)
                            .map((person) => (
                              <div
                                key={person.id}
                                className="member-manage-card opacity-70"
                              >
                                <div className="member-manage-info">
                                  <div className="member-manage-avatar">
                                    {person.name[0]}
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold line-through">
                                      {person.name}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {person.relation}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="member-restore-btn"
                                  onClick={() => handleRestore(person.id)}
                                >
                                  <RotateCcw size={12} />
                                  Wapas Layein
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
