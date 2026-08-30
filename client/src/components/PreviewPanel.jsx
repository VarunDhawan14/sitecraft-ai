import { useEffect, useMemo, useRef, useState } from "react";
import {
  SandpackLayout,
  SandpackProvider,
  SandpackPreview,
  SandpackCodeEditor,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { detectDependencies } from "../utils/sandpackUtils";
import { useAppContext } from "../context/AppContext";
import SandpackErrorMonitor from "./SandpackErrorMonitor";

// Watches for file edits inside Sandpack editor
// and saves changes to DB without resetting the editor.
function SandpackFileWatcher() {
  const { sandpack } = useSandpack();
  const { files } = sandpack;
  const { activeProject, updateProjectFiles } = useAppContext();

  const activeProjectRef = useRef(activeProject);

  useEffect(() => {
    activeProjectRef.current = activeProject;
  }, [activeProject]);

  useEffect(() => {
    const project = activeProjectRef.current;

    if (!project) return;

    const updatedFiles = {};
    let hasChanges = false;

    for (const [path, fileObj] of Object.entries(files)) {
      const filecode = fileObj.code;

      updatedFiles[path] = filecode;

      const originalContent =
        typeof project.files[path] === "string"
          ? project.files[path]
          : project.files[path]?.content;

      if (originalContent !== undefined && originalContent !== filecode) {
        hasChanges = true;
      }
    }

    // Updating liveFiles on every keystroke causes Sandpack
    // to recreate its files and switch/reset the editor.

    if (hasChanges) {
      updateProjectFiles(updatedFiles);
    }
  }, [files, updateProjectFiles]);

  return null;
}

const PreviewPanel = ({ project, activeFile, showCode }) => {
  const [showErrorOverlay, setShowErrorOverlay] = useState(true);

  // Local copy of project files
  const [liveFiles, setLiveFiles] = useState(project.files);

  const projectKey = `${project._id}-${project.version}`;

  // Update local files ONLY when project/version actually changes.
  // Do not update this state when the user types in Sandpack.
  useEffect(() => {
    setLiveFiles(project.files);
  }, [projectKey, project.files]);

  // Convert files to Sandpack format
  const sandpackFiles = useMemo(() => {
    const spFiles = {};

    for (const [path, content] of Object.entries(liveFiles)) {
      const filecode =
        typeof content === "string" ? content : content?.content || "";

      spFiles[path] = {
        code: filecode,
        active: path === activeFile,
      };
    }
    return spFiles;
  }, [liveFiles, activeFile]);

  // Detect dependencies from project files
  const dependencies = useMemo(() => {
    return detectDependencies(liveFiles);
  }, [liveFiles]);

  return (
    <div className='h-full w-full'>
      <SandpackProvider
        key={projectKey}
        template='react'
        files={sandpackFiles}
        customSetup={{ dependencies }}
        options={{
          externalResources: [
            "https://cdn.tailwindcss.com",
            "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
          ],
          classes: {
            "sp-wrapper": "sp-wrapper",
            "sp-layout": "sp-layout",
            "sp-preview": "sp-preview",
          },
          logLevel: 0,
        }}
        theme={{
          colors: {
            surface1: "#ffffff",
            surface2: "#f4f4f5",
            surface3: "#e4e4e7",
            clickable: "#71717a",
            base: "#09090b",
            disabled: "#a1a1aa",
            hover: "#18181b",
            accent: "#18181b",
            error: "#ef4444",
            errorSurface: "#fef2f2",
          },
          font: {
            body: "'Urbanist', system-ui, -apple-system, sans-serif",
            mono: "'Geist Mono', ui-monospace, monospace",
            size: "13px",
            lineHeight: "1.6",
          },
        }}
      >
        <SandpackFileWatcher />

        <SandpackErrorMonitor onErrorChange={setShowErrorOverlay} />

        <SandpackLayout
          style={{
            height: "100%",
            border: "none",
            borderRadius: 0,
            background: "transparent",
          }}
        >
          {showCode && (
            <SandpackCodeEditor
              showTabs
              showLineNumbers
              showInlineErrors
              wrapContent
              style={{
                height: "100%",
                flex: 1,
                minWidth: 0,
              }}
            />
          )}

          <SandpackPreview
            showNavigator={false}
            showRefreshButton
            showOpenInCodeSandbox={false}
            showSandpackErrorOverlay={showErrorOverlay}
            style={{
              height: "100%",
              flex: showCode ? 1 : 2,
              minWidth: 0,
            }}
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
};

export default PreviewPanel;
