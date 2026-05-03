import { useRef, useState } from "react";
import { Tldraw, loadSnapshot } from "tldraw";
import "tldraw/tldraw.css";

/* -------------------------
   TYPES
------------------------- */
type Block =
  | { id: string; type: "text"; content: string }
  | { id: string; type: "tldraw"; snapshot?: any };

type Step = {
  id: string;
  title: string;
  blocks: Block[];

  // future-proof metadata (important for manufacturing use case)
  meta?: {
    stepNumber?: number;
    durationMinutes?: number;
    role?: string;
  };
};

type Operation = {
  id: string;
  name: string;
  steps: Step[];
};

/* -------------------------
   INITIAL DATA
------------------------- */
const initialData: Operation = {
  id: "op1",
  name: "Sample Operation",
  steps: [
    {
      id: "s1",
      title: "Step 1 - Prep",
      blocks: [
        { id: "b1", type: "text", content: "Verify all parts are available." }
      ]
    },
    {
      id: "s2",
      title: "Step 2 - Install",
      blocks: [
        { id: "b1", type: "text", content: "Place bracket into position." },
        { id: "b2", type: "tldraw" }
      ]
    }
  ]
};

/* -------------------------
   TITLE
------------------------- */
function PageTitle({
  value,
  onChange
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontSize: 20,
        fontWeight: "bold",
        width: "100%",
        padding: 6,
        marginBottom: 10,
        border: "1px solid #ccc",
        borderRadius: 4
      }}
    />
  );
}

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
  const [operation, setOperation] = useState<Operation>(initialData);
  const [activeStep, setActiveStep] = useState(0);

  const step = operation.steps[activeStep];

  /* -------------------------
     UPDATE TEXT BLOCK
  ------------------------- */
  const updateText = (blockId: string, value: string) => {
    setOperation((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === step.id
          ? {
              ...s,
              blocks: s.blocks.map((b) =>
                b.id === blockId && b.type === "text"
                  ? { ...b, content: value }
                  : b
              )
            }
          : s
      )
    }));
  };

  /* -------------------------
     EXPORT
  ------------------------- */
  const exportJSON = () => {
    const dataStr = JSON.stringify(operation, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "work-instruction.json";
    a.click();

    URL.revokeObjectURL(url);
  };

  /* -------------------------
     IMPORT
  ------------------------- */
  const importJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        setOperation(parsed);   // ✅ FIXED
        setActiveStep(0);
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
      <div style={{ height: 50, display: "flex", alignItems: "center", gap: 10 }}>
        <strong>Operation Editor</strong>
        <button onClick={exportJSON}>Export</button>
        <input type="file" onChange={importJSON} />
      </div>

      <div style={{ display: "flex", flex: 1 }}>

        {/* STEPS */}
        <div style={{ width: 250, borderRight: "1px solid #ccc" }}>
          {operation.steps.map((s, i) => (
            <div
              key={s.id}
              onClick={() => setActiveStep(i)}
              style={{
                padding: 10,
                cursor: "pointer",
                background: i === activeStep ? "#eee" : "white"
              }}
            >
              <input
                value={s.title}
                onChange={(e) => {
                  const value = e.target.value;

                  setOperation((prev) => ({
                    ...prev,
                    steps: prev.steps.map((st) =>
                      st.id === s.id
                        ? { ...st, title: value }
                        : st
                    )
                  }));
                }}
                style={{ width: "100%", fontWeight: "bold" }}
              />
            </div>
          ))}
        </div>

        {/* STEP CONTENT */}
        <div style={{ flex: 1, padding: 20 }}>
          <h2>{step.title}</h2>

          {step.blocks.map((block) => {
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
                    setOperation((prev) => ({
                      ...prev,
                      steps: prev.steps.map((s) =>
                        s.id === step.id
                          ? {
                              ...s,
                              blocks: s.blocks.map((b) =>
                                b.id === block.id
                                  ? { ...b, snapshot }
                                  : b
                              )
                            }
                          : s
                      )
                    }));
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