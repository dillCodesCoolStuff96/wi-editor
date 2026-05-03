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
};

type Operation = {
  id: string;
  name: string;
  steps: Step[];
};

/* -------------------------
   HELPERS
------------------------- */
const createStep = (): Step => ({
  id: crypto.randomUUID(),
  title: "New Step",
  blocks: []
});

const createBlock = (type: Block["type"]): Block => {
  if (type === "text") {
    return {
      id: crypto.randomUUID(),
      type: "text",
      content: ""
    };
  }

  return {
    id: crypto.randomUUID(),
    type: "tldraw",
    snapshot: undefined
  };
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

/*
Wrapper
*/

function BlockWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        padding: 10,
        marginBottom: 12,
        borderRadius: 6
      }}
    >
      {children}
    </div>
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
------------------------- */
function TldrawBlock({
  snapshot,
  onChange
}: {
  snapshot?: any;
  onChange: (snapshot: any) => void;
}) {
  const editorRef = useRef<any>(null);

  return (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      height: 460, // important: locks layout
      border: "1px solid #ccc",
      borderRadius: 6,
      overflow: "hidden"
    }}
  >
    {/* CANVAS AREA */}
    <div style={{ flex: 1, minHeight: 0 }}>
      <Tldraw
        onMount={(editor) => {
          editorRef.current = editor;

          if (snapshot) {
            loadSnapshot(editor.store, snapshot);
          }
        }}
      />
    </div>

    {/* CONTROL BAR (BOTTOM) */}
    <div
      style={{
        padding: 8,
        borderTop: "1px solid #ddd",
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
        background: "#fafafa"
      }}
    >
      <button
        onClick={() => {
          if (!editorRef.current) return;

          const snap = editorRef.current.store.getStoreSnapshot();
          onChange(snap);
        }}
      >
        Save Drawing
      </button>
    </div>
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* -------------------------
     STEP UPDATE HELPERS
  ------------------------- */
  const updateStep = (stepId: string, updater: (s: Step) => Step) => {
    setOperation(prev => ({
      ...prev,
      steps: prev.steps.map(s =>
        s.id === stepId ? updater(s) : s
      )
    }));
  };

  const deleteStep = (stepId: string) => {
    setOperation(prev => {
      const updated = prev.steps.filter(s => s.id !== stepId);

      return {
        ...prev,
        steps: updated
      };
    });

    setActiveStep(0);
  };

  /* -------------------------
     BLOCK UPDATE
  ------------------------- */
  const updateText = (blockId: string, value: string) => {
    updateStep(step.id, (s) => ({
      ...s,
      blocks: s.blocks.map(b =>
        b.id === blockId && b.type === "text"
          ? { ...b, content: value }
          : b
      )
    }));
  };

  const deleteBlock = (blockId: string) => {
    updateStep(step.id, (s) => ({
      ...s,
      blocks: s.blocks.filter(b => b.id !== blockId)
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
     UI
  ------------------------- */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>

      {/* TOP BAR */}
      <div style={{ display: "flex", gap: 10, padding: 10 }}>
        <strong>Operation Editor</strong>

        <button onClick={exportJSON}>Export</button>

        <button onClick={() => setOperation(prev => ({
          ...prev,
          steps: [...prev.steps, createStep()]
        }))}>
          + Add Step
        </button>

        <button
  onClick={() => fileInputRef.current?.click()}
>
  Import Instructions
</button>

  <input
    ref={fileInputRef}
    type="file"
    accept="application/json"
    style={{ display: "none" }}
    onChange={(event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);

          // basic validation guard (important)
          if (!parsed.steps || !Array.isArray(parsed.steps)) {
            alert("Invalid instruction file");
            return;
          }

          setOperation(parsed);
          setActiveStep(0);
        } catch {
          alert("Invalid JSON file");
        }
      };

      reader.readAsText(file);
    }}
  />
      </div>

      <div style={{ display: "flex", flex: 1 }}>

        {/* STEPS */}
        <div style={{ width: 280, borderRight: "1px solid #ccc" }}>
          {operation.steps.map((s, i) => (
            <div
              key={s.id}
              style={{
                padding: 10,
                background: i === activeStep ? "#eee" : "white",
                cursor: "pointer"
              }}
            >
              <input
                value={s.title}
                onChange={(e) =>
                  updateStep(s.id, step => ({
                    ...step,
                    title: e.target.value
                  }))
                }
                style={{ width: "100%", fontWeight: "bold" }}
                onClick={() => setActiveStep(i)}
              />

              <button onClick={() => deleteStep(s.id)} style={{ color: "red" }}>
                Delete Step
              </button>
            </div>
          ))}
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, padding: 20 }}>

          <h2>{step.title}</h2>

          {/* Add block buttons */}
          <div style={{ marginBottom: 10 }}>
            <button
              onClick={() =>
                updateStep(step.id, s => ({
                  ...s,
                  blocks: [...s.blocks, createBlock("text")]
                }))
              }
            >
              + Text
            </button>

            <button
              onClick={() =>
                updateStep(step.id, s => ({
                  ...s,
                  blocks: [...s.blocks, createBlock("tldraw")]
                }))
              }
            >
              + Drawing
            </button>
          </div>

          {/* BLOCKS */}
          {step.blocks.map(block => (
            <div key={block.id} style={{ marginBottom: 15 }}>

              {block.type === "text" && (
                <>
                  <BlockWrapper>
                    <TextBlock
                      content={block.content}
                      onChange={(v) => updateText(block.id, v)}
                    />

                    <button onClick={() => deleteBlock(block.id)} style={{ color: "red" }}>
                      Remove
                    </button>
                  </BlockWrapper>
                </>
              )}

              {block.type === "tldraw" && (
                <>
                  <BlockWrapper>
                    <TldrawBlock
                      snapshot={block.snapshot}
                      onChange={(snapshot) =>
                        updateStep(step.id, s => ({
                          ...s,
                          blocks: s.blocks.map(b =>
                            b.id === block.id ? { ...b, snapshot } : b
                          )
                        }))
                      }
                    />

                    <div style={{ marginTop: 8 }}>
                      <button onClick={() => deleteBlock(block.id)} style={{ color: "red" }}>
                        Remove
                      </button>
                    </div>
                  </BlockWrapper>
                </>
              )}

            </div>
          ))}

        </div>
      </div>
    </div>
  );
}