import { useEffect, useState } from "react";
import Loading from "../components/Loading";
import { useParams } from "react-router-dom";
import FullPagePreview from "../components/FullPagePreview";
import { useAppContext } from "../context/AppContext";

const PreviewPage = () => {
  const { id } = useParams();
  const {
    activeProject: project,
    loadingActiveProject: loading,
    loadProject,
  } = useAppContext();

  useEffect(() => {
    if (id) {
      loadProject(id);
    }
  }, [id]);

  if (loading || !project) {
    return <Loading />;
  }

  return <FullPagePreview files={project.files} />;
};

export default PreviewPage;
