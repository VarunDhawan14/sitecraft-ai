import React, { useState } from "react";

const PreviewPanel = ({ project, activeFile, showCode }) => {
  const [showErrorOverlay, setShowErrorOverlay] = useState(true);

  // Keep local state of files that updates as user types
  const [liveFiles, setLiveFiles] = useState(project.files);
  const [prevProjectKey, setPrevProjectKey] = useState(
    `${project._id}-${project.version}`,
  );

  const currentKey = `${project._id}-${project.version}`;
  if (prevProjectKey !== currentKey) {
    setPrevProjectKey(currentKey);
    setLiveFiles(project.files);
  }

  return <div></div>;
};

export default PreviewPanel;
