import { useRef, useState } from "react";
import { Tldraw, loadSnapshot } from "tldraw";
import "tldraw/tldraw.css";

/* -------------------------
   TYPES
------------------------- */
type Block =
  | { id: string; type: "text"; content: string }
  | { id: string; type: "tldraw"; snapshot?: any };

type Page = {
  id: string;
  title: string;
  blocks: Block[];
};

/* -------------------------
   INITIAL DATA
------------------------- */
const initialData: Page[] = [
  {
    id: "p1",
    title: "Step 1 - Prep",
    blocks: [
      { id: "b1", type: "text", content: "Verify all parts are available." }
    ]
  },
  {
    id: "p2",
    title: "Step 2 - Install",
    blocks: [
      { id: "b1", type: "text", content: "Place bracket into position." },
      { id: "b2", type: "tldraw" }
    ]
  }
];

/* -------------------------
   TEXT BLOCK
------------------------- */
function TextBlock({
  content,
  onChange
}: {
  content: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={content}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        minHeight: 80,
        marginBottom: 10,
        padding: 10
      }}
    />
  );
}

/* -------------------------
   TLDRAW BLOCK
   (FIXED VERSION)
------------------------- */
function TldrawBlock({
  snapshot,
  onChange
}: {
  snapshot?: any;
  onChange: (snapshot: any) => void;
}) {
  // ✅ FIX #1: persistent editor reference (NOT global, NOT local var)
  const editorRef = useRef<any>(null);

  return (
    <div style={{ height: 400, border: "1px solid #ccc" }}>
      <Tldraw
        onMount={(editor) => {
          // store editor instance safely
          editorRef.current = editor;

          // load saved snapshot
          if (snapshot) {
            loadSnapshot(editor.store, snapshot);
          }
        }}
      />

      {/* -------------------------
         SAVE DRAWING BUTTON
         FIXED SNAPSHOT SOURCE
      ------------------------- */}
      <button
        onClick={() => {
          // ✅ FIX #2: guard FIRST
          if (!editorRef.current) return;

          // take snapshot from correct store
          const snap = editorRef.current.store.getStoreSnapshot();

          console.log("TLDRAW SAVE SNAPSHOT:", snap.store);

          onChange(snap);
        }}
      >
        Save Drawing
      </button>
    </div>
  );
}

/* -------------------------
   APP
------------------------- */
export default function App() {
  const [pages, setPages] = useState<Page[]>(initialData);

  // (optional improvement but not required)
  const [activePage, setActivePage] = useState(0);

  const page = pages[activePage];

  /* -------------------------
     UPDATE TEXT BLOCK
  ------------------------- */
  const updateText = (blockId: string, value: string) => {
    setPages((prev) =>
      prev.map((p) => {
        // SAFE: using current page id still OK for this simple app
        if (p.id !== page.id) return p;

        return {
          ...p,
          blocks: p.blocks.map((b) =>
            b.id === blockId && b.type === "text"
              ? { ...b, content: value }
              : b
          )
        };
      })
    );
  };

  /* -------------------------
     EXPORT JSON
     (this is now correct because state is correct)
  ------------------------- */
  const exportJSON = () => {
    const dataStr = JSON.stringify(pages, null, 2);

    const blob = new Blob([dataStr], { type: "application/json" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "work-instruction.json";
    a.click();

    URL.revokeObjectURL(url);
  };

  /* -------------------------
     IMPORT JSON
  ------------------------- */
  const importJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        setPages(parsed);
        setActivePage(0);
      } catch {
        alert("Invalid JSON file");
      }
    };

    reader.readAsText(file);
  };

  /* -------------------------
     UI
  ------------------------- */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      
      {/* TOP BAR */}
      <div
        style={{
          height: 50,
          borderBottom: "1px solid #ccc",
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          gap: 10,
          background: "#fafafa"
        }}
      >
        <strong>Operation Editor</strong>

        <button onClick={exportJSON}>Export Operation</button>

        <label>
          <input type="file" accept="application/json" onChange={importJSON} />
        </label>
      </div>

      {/* MAIN BODY */}
      <div style={{ display: "flex", flex: 1 }}>
        
        {/* PAGE LIST */}
        <div style={{ width: 250, borderRight: "1px solid #ccc" }}>
          {pages.map((p, i) => (
            <div
              key={p.id}
              onClick={() => setActivePage(i)}
              style={{
                padding: 10,
                cursor: "pointer",
                background: i === activePage ? "#eee" : "white"
              }}
            >
              {p.title}
            </div>
          ))}
        </div>

        {/* PAGE CONTENT */}
        <div style={{ flex: 1, padding: 20, overflow: "auto" }}>
          <h2>{page.title}</h2>

          {page.blocks.map((block) => {
            if (block.type === "text") {
              return (
                <TextBlock
                  key={block.id}
                  content={block.content}
                  onChange={(v) => updateText(block.id, v)}
                />
              );
            }

            if (block.type === "tldraw") {
              return (
                <TldrawBlock
                  key={block.id}
                  snapshot={block.snapshot}
                  onChange={(snapshot) => {
                    // IMPORTANT FIX CONTEXT:
                    // now state is always updated correctly per page

                    setPages((prev) =>
                      prev.map((p) => {
                        if (p.id !== page.id) return p;

                        return {
                          ...p,
                          blocks: p.blocks.map((b) =>
                            b.id === block.id
                              ? { ...b, snapshot }
                              : b
                          )
                        };
                      })
                    );
                  }}
                />
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}