import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { useNavigate, useParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import Loading from "../components/Loading";
import BuilderHeader from "../components/BuilderHeader";
import { FolderIcon, MessageSquareIcon } from "lucide-react";
import ChatPanel from "../components/ChatPanel";
import FileExplorer from "../components/FileExplorer";
import PreviewPanel from "../components/PreviewPanel";
import AgentProgressDashboard from "../components/AgentProgressDashboard";
import PublishModal from "../components/PublishModal";
import api from "../api/api";
import { exportProjectZip } from "../utils/exportProject";

const BuilderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [leftTab, setLeftTab] = useState("chat");
  const [publishing, setPublishing] = useState(false);
  const [publishUrl, setPublishUrl] = useState(null);

  const {
    activeProject,
    loadingActiveProject,
    activeFile,
    showCode,
    setActiveFile,
    setShowCode,
    logout,
    loadProject,
    chatLoading,
    handleChat,
  } = useAppContext();

  // ============================================================
  // Initial Project Load
  // ============================================================

  useEffect(() => {
    if (!id) return;

    loadProject(id);
  }, [id, loadProject]);

  // ============================================================
  // Poll Project While AI Is Generating
  // ============================================================

  useEffect(() => {
    if (!id || !activeProject) return;

    const isGenerating =
      activeProject.status === "pending" ||
      activeProject.status === "generating";

    // Do not poll after generation has completed or failed.
    if (!isGenerating) return;

    const interval = setInterval(() => {
      loadProject(id, true);
    }, 1500);

    return () => {
      clearInterval(interval);
    };
  }, [id, activeProject?.status, loadProject]);

  // ============================================================
  // Open Preview
  // ============================================================

  const handleOpenPreview = () => {
    if (!id) return;

    window.open(`/preview/${id}`, "_blank");
  };

  // ============================================================
  // Publish Project
  // ============================================================

  const handlePublish = async () => {
    if (!id) return;

    setPublishing(true);

    try {
      await api.post(`/api/projects/${id}/publish`);

      const url = `${window.location.origin}/publish/${id}`;

      setPublishUrl(url);

      toast.success("Website published successfully!");
    } catch (err) {
      console.error("Publish failed:", err);

      toast.error(err?.response?.data?.error || "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  // ============================================================
  // Download Project
  // ============================================================

  const handleDownload = () => {
    if (!activeProject) return;

    exportProjectZip(activeProject);
  };

  // ============================================================
  // Loading State
  // ============================================================

  if (loadingActiveProject || !activeProject) {
    return <Loading />;
  }

  // ============================================================
  // Main Builder UI
  // ============================================================

  return (
    <div className='h-screen flex flex-col bg-white overflow-hidden text-zinc-900 relative'>
      {/* ======================================================
          Toast Notifications
      ====================================================== */}

      <Toaster
        position='top-center'
        toastOptions={{
          duration: 3000,
        }}
      />

      {/* ======================================================
          Top Header
      ====================================================== */}

      <BuilderHeader
        projectName={activeProject.name}
        version={activeProject.version}
        showCode={showCode}
        publishing={publishing}
        onToggleShowCode={() => setShowCode(!showCode)}
        onOpenPreview={handleOpenPreview}
        onPublish={handlePublish}
        onDownload={handleDownload}
        onBack={() => navigate("/")}
        onLogout={logout}
      />

      {/* ======================================================
          Main Layout
      ====================================================== */}

      <div className='flex-1 flex overflow-hidden'>
        {/* ====================================================
            Left Sidebar
        ==================================================== */}

        <div className='w-[320px] shrink-0 flex flex-col border-r border-zinc-200 bg-white'>
          {/* ==================================================
              Sidebar Tabs
          ================================================== */}

          <div className='flex border-b border-zinc-100'>
            {/* Chat Tab */}

            <button
              onClick={() => setLeftTab("chat")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium cursor-pointer ${
                leftTab === "chat"
                  ? "text-zinc-900 border-b-2 border-zinc-900"
                  : "text-zinc-400 hover:text-zinc-700"
              }`}
            >
              <MessageSquareIcon size={13} />
              Chat
            </button>

            {/* Files Tab */}

            <button
              onClick={() => setLeftTab("files")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium cursor-pointer ${
                leftTab === "files"
                  ? "text-zinc-900 border-b-2 border-zinc-900"
                  : "text-zinc-400 hover:text-zinc-700"
              }`}
            >
              <FolderIcon size={13} />
              Files
            </button>
          </div>

          {/* ==================================================
              Sidebar Content
          ================================================== */}

          <div className='flex-1 overflow-hidden'>
            {leftTab === "chat" ? (
              <ChatPanel
                messages={activeProject.messages}
                onSend={handleChat}
                loading={chatLoading}
              />
            ) : (
              <FileExplorer
                files={activeProject.files}
                activeFile={activeFile}
                onFileSelect={(path) => {
                  setActiveFile(path);
                  setShowCode(true);
                }}
              />
            )}
          </div>
        </div>

        {/* ====================================================
            Preview / Code / AI Progress Area
        ==================================================== */}

        <div className='flex-1 overflow-hidden'>
          {/* --------------------------------------------------
              AI Generation In Progress
          -------------------------------------------------- */}

          {activeProject.status === "pending" ||
          activeProject.status === "generating" ? (
            <AgentProgressDashboard project={activeProject} />
          ) : (
            /* ------------------------------------------------
               Generation Finished
            ------------------------------------------------ */

            <PreviewPanel
              project={activeProject}
              activeFile={activeFile}
              showCode={showCode}
            />
          )}
        </div>
      </div>

      {/* ======================================================
          Publish Modal
      ====================================================== */}

      {publishUrl && (
        <PublishModal
          publishUrl={publishUrl}
          onClose={() => setPublishUrl(null)}
        />
      )}
    </div>
  );
};

export default BuilderPage;
