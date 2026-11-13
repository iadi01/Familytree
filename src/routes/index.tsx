import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Heart,
  Plus,
  Users,
  Sparkles,
  ArrowRight,
  Trees as TreeIcon,
  ShieldCheck,
  Search,
  ExternalLink,
} from "lucide-react";
import gardenImg from "@/assets/family-garden.jpg";
import { nanaImg, naniImg } from "@/lib/avatars";
import {
  subscribeToAllTrees,
  createOrUpdateTree,
  type TreeMeta,
} from "@/lib/firebase";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Humara Parivar — Create & Celebrate Your Family Tree" },
      {
        name: "description",
        content:
          "Apna khud ka illustrated family tree banayein ya Sharma Family Tree dekhein. Real-time sync, photo uploads aur mobile-friendly design.",
      },
      { property: "og:title", content: "Humara Parivar — Family Tree Creator" },
      {
        property: "og:description",
        content: "Rooted in Love, Growing Together across Generations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IndexHub,
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function IndexHub() {
  const navigate = useNavigate();
  const [trees, setTrees] = useState<TreeMeta[]>([]);

  // Create form state
  const [familyName, setFamilyName] = useState("");
  const [root1, setRoot1] = useState("");
  const [root2, setRoot2] = useState("");
  const [rootRelation, setRootRelation] = useState("Nana & Nani");
  const [customSlug, setCustomSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search/open existing code
  const [openCode, setOpenCode] = useState("");

  useEffect(() => {
    const unsub = subscribeToAllTrees((liveTrees) => {
      setTrees(liveTrees);
    });
    return () => unsub();
  }, []);

  // Auto-slugify when family name changes
  const handleFamilyNameChange = (name: string) => {
    setFamilyName(name);
    if (!customSlug || customSlug === slugify(familyName)) {
      setCustomSlug(slugify(name));
    }
  };

  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim() || !root1.trim()) return;

    setIsSubmitting(true);
    const finalSlug = slugify(customSlug || familyName) || `family-${Date.now()}`;

    const newTreeMeta: TreeMeta = {
      id: finalSlug,
      name: familyName.trim(),
      rootName: root1.trim(),
      rootSpouse: root2.trim() || undefined,
      rootRelation: rootRelation || "Grandparents",
      createdAt: Date.now(),
    };

    try {
      await createOrUpdateTree(newTreeMeta);
      navigate({ to: "/tree/$treeId", params: { treeId: finalSlug } });
    } catch (err) {
      console.error("Error creating tree:", err);
      alert("Tree create karne me samasya aayi. Kripya punah prayas karein.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = slugify(openCode);
    if (!code) return;
    navigate({ to: "/tree/$treeId", params: { treeId: code } });
  };

  return (
    <div className="hub-page">
      <img
        className="garden-background"
        src={gardenImg}
        alt=""
        width={1920}
        height={1088}
      />

      {/* Hub Top Bar */}
      <header className="hub-header">
        <div className="hub-brand">
          <span className="text-4xl">🌳</span>
          <div>
            <h1 className="text-2xl font-bold font-display leading-tight">
              Humara Parivar
            </h1>
            <p className="text-xs text-muted-foreground">
              Illustrated Family Tree Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            className="rounded-full shadow-sm text-xs font-semibold"
            onClick={() =>
              navigate({ to: "/tree/$treeId", params: { treeId: "sharma" } })
            }
          >
            🌸 Sharma Tree Kholein
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="hub-main-container">
        <div className="hub-hero-banner">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-primary font-bold text-xs shadow-sm mb-3">
            <Sparkles size={14} /> Har Parivaar Ki Apni Kahani
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-display leading-snug">
            Apna Khud Ka Family Tree Banayein
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Nana-Nani, Dada-Dadi se lekar sabhi dampati aur nanhe sitaron tak —
            apne parivaar ko ek sundar, real-time tree me sanjoyein.
          </p>
        </div>

        {/* Action Grid */}
        <div className="hub-grid">
          {/* Card 1: Create New Tree */}
          <div className="hub-card primary-card">
            <div className="hub-card-header">
              <div className="hub-icon-bubble bg-primary text-primary-foreground">
                <Plus size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Naya Tree Banayein</h3>
                <p className="text-xs text-muted-foreground">
                  Create your own family tree in 30 seconds
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateTree} className="hub-form">
              <label className="flex flex-col gap-1.5 text-xs font-semibold">
                Parivaar ka Naam (Family Name) *
                <input
                  required
                  value={familyName}
                  onChange={(e) => handleFamilyNameChange(e.target.value)}
                  placeholder="Udaharan: Verma Family Tree, Gupta Parivaar"
                  className="hub-input"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-xs font-semibold">
                  Mukhya / Nana / Dada ka Naam *
                  <input
                    required
                    value={root1}
                    onChange={(e) => setRoot1(e.target.value)}
                    placeholder="Udaharan: Ramesh Sharma"
                    className="hub-input"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold">
                  Nani / Dadi / Patni ka Naam
                  <input
                    value={root2}
                    onChange={(e) => setRoot2(e.target.value)}
                    placeholder="Udaharan: Geeta Sharma"
                    className="hub-input"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-xs font-semibold">
                  Rishta (Title of Roots)
                  <select
                    value={rootRelation}
                    onChange={(e) => setRootRelation(e.target.value)}
                    className="hub-input"
                  >
                    <option value="Nana & Nani">Nana & Nani</option>
                    <option value="Dada & Dadi">Dada & Dadi</option>
                    <option value="Grandparents">Grandparents</option>
                    <option value="Mata & Pita">Mata & Pita (Parents)</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold">
                  Tree Code / URL Link
                  <input
                    value={customSlug}
                    onChange={(e) => setCustomSlug(slugify(e.target.value))}
                    placeholder="verma-family"
                    className="hub-input font-mono text-xs"
                  />
                </label>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full py-5 text-sm font-bold shadow-md mt-2 flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                <span>
                  {isSubmitting
                    ? "Tree Banaya Ja Raha Hai..."
                    : "Apna Tree Banayein & Kholein"}
                </span>
                <ArrowRight size={16} />
              </Button>
            </form>
          </div>

          {/* Card 2: Featured Sharma Family Tree */}
          <div className="hub-card featured-card">
            <div className="hub-card-header">
              <div className="hub-icon-bubble bg-pink-500 text-white">
                <Heart size={20} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full">
                  Featured Family Tree
                </span>
                <h3 className="text-xl font-bold mt-1">Sharma Family Tree</h3>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Nana & Nani ki chhatra-chhaya me Sharma parivaar ke sabhi 10 dampati
              (Moushi, Mama) aur unke nanhe sitaron ki puri kahani.
            </p>

            <div className="featured-grandparents-preview">
              <div className="featured-avatar">
                <img src={nanaImg} alt="Nana" />
                <span>Nana</span>
              </div>
              <span className="text-xl text-primary animate-pulse">💗</span>
              <div className="featured-avatar">
                <img src={naniImg} alt="Nani" />
                <span>Nani</span>
              </div>
            </div>

            <Button
              className="w-full rounded-full py-5 text-sm font-bold shadow-md mt-auto flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white"
              onClick={() =>
                navigate({ to: "/tree/$treeId", params: { treeId: "sharma" } })
              }
            >
              <span>Sharma Family Tree Kholein</span>
              <ExternalLink size={16} />
            </Button>
          </div>

          {/* Card 3: Enter Code / Open Existing */}
          <div className="hub-card">
            <div className="hub-card-header">
              <div className="hub-icon-bubble bg-amber-600 text-white">
                <Search size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Kisi Ka Tree Kholein</h3>
                <p className="text-xs text-muted-foreground">
                  Open any family tree with Tree Code
                </p>
              </div>
            </div>

            <form onSubmit={handleOpenByCode} className="hub-form mt-2">
              <label className="flex flex-col gap-1.5 text-xs font-semibold">
                Tree Code / Slug daalein:
                <input
                  required
                  value={openCode}
                  onChange={(e) => setOpenCode(e.target.value)}
                  placeholder="Udaharan: sharma, gupta-family"
                  className="hub-input font-mono text-sm"
                />
              </label>

              <Button
                type="submit"
                variant="secondary"
                className="w-full rounded-full py-5 text-sm font-bold shadow-sm flex items-center justify-center gap-2 mt-1"
              >
                <span>Tree Kholein (Open)</span>
                <ArrowRight size={16} />
              </Button>
            </form>

            {/* List of created trees */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Available Trees ({trees.length + 1})
              </p>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                <button
                  type="button"
                  className="hub-tree-item"
                  onClick={() =>
                    navigate({
                      to: "/tree/$treeId",
                      params: { treeId: "sharma" },
                    })
                  }
                >
                  <div className="text-left">
                    <div className="text-xs font-bold">🌸 Sharma Family Tree</div>
                    <div className="text-[10px] text-muted-foreground">
                      Code: sharma · Nana & Nani
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-muted-foreground" />
                </button>

                {trees
                  .filter((t) => t.id !== "sharma")
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="hub-tree-item"
                      onClick={() =>
                        navigate({
                          to: "/tree/$treeId",
                          params: { treeId: t.id },
                        })
                      }
                    >
                      <div className="text-left">
                        <div className="text-xs font-bold">🌳 {t.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Code: {t.id} · {t.rootName}
                          {t.rootSpouse ? ` & ${t.rootSpouse}` : ""}
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground" />
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="hub-footer">
        <p className="text-xs text-muted-foreground">
          Humara Parivar · Har Peedhi Ka Pyaar · Crafted with ♥ by Humna
        </p>
      </footer>
    </div>
  );
}
