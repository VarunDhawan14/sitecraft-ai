import { Project } from "../models/Project.js";
import crypto from "crypto";
import { generateProject } from "../services/ai.js";

// Function: Hash Content
function hashContent(content) {
  return crypto.createHash("md5").update(content).digest("hex").slice(0, 12);
}

// Helper: Convert stored files into plain content object
function getFilesObject(files = {}) {
  const filesObj = {};

  for (const [path, entry] of Object.entries(files)) {
    if (entry && typeof entry === "object" && "content" in entry) {
      filesObj[path] = entry.content;
    } else if (typeof entry === "string") {
      filesObj[path] = entry;
    }
  }

  return filesObj;
}

// ============================================================
// POST /api/projects
// Description: Create a new project from an AI prompt.
// ============================================================

export async function createProject(req, res) {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({
        error: "Prompt is required",
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        error: "Unauthorized",
      });
      return;
    }

    // Create project immediately with "pending" status.
    const project = await Project.create({
      name: "Planning project....",
      description: prompt,
      files: {},
      messages: [
        {
          role: "user",
          content: prompt,
          timestamp: new Date(),
        },
        {
          role: "assistant",
          content: "Planning project structure....",
          timestamp: new Date(),
        },
      ],
      version: 0,
      owner: req.user.userId,
      status: "pending",
      filesPlanned: [],
      filesGenerated: [],
      currentFile: null,
      error: null,
    });

    // Start background AI generation.
    runBackgroundGeneration(project._id.toString(), prompt).catch((err) => {
      console.error(
        `[Background AI] Fatal generation error for project ${project._id}:`,
        err,
      );
    });

    res.status(201).json({
      _id: project._id,
      name: project.name,
      description: project.description,
      files: {},
      messages: project.messages,
      version: project.version,
      status: project.status,
      filesPlanned: project.filesPlanned,
      filesGenerated: project.filesGenerated,
      currentFile: project.currentFile,
      error: project.error,
      createdAt: project.createdAt,
    });
  } catch (err) {
    console.error("[Create Project] Error:", err);

    res.status(500).json({
      error: err.message || "Failed to create project",
    });
  }
}

// ============================================================
// Background AI Generation
// ============================================================

async function runBackgroundGeneration(projectId, prompt) {
  try {
    console.log(`[Background AI] Starting generation for project ${projectId}`);

    const result = await generateProject(prompt, {
      // --------------------------------------------------------
      // AI PLAN CREATED
      // --------------------------------------------------------

      onPlan: async (plan) => {
        console.log(
          `[Background AI] Plan created for project ${projectId}. ` +
            `Planned ${plan.files.length} files.`,
        );

        const fileList = plan.files
          .map((file) => `- \`${file.path}\`: ${file.description}`)
          .join("\n");

        await Project.findByIdAndUpdate(
          projectId,
          {
            $set: {
              name: plan.projectName || "Generated Project",
              status: "generating",
              filesPlanned: plan.files,
            },
            $push: {
              messages: {
                role: "assistant",
                content: `Planned website structure:\n${fileList}`,
                timestamp: new Date(),
              },
            },
          },
          {
            new: true,
          },
        );
      },

      // --------------------------------------------------------
      // FILE GENERATION STARTED
      // --------------------------------------------------------

      onFileStart: async (path) => {
        console.log(
          `[Background AI] Starting file ${path} for project ${projectId}.`,
        );

        await Project.findByIdAndUpdate(
          projectId,
          {
            $set: {
              currentFile: path,
            },
          },
          {
            new: true,
          },
        );
      },

      // --------------------------------------------------------
      // FILE GENERATION COMPLETED
      // --------------------------------------------------------

      onFileComplete: async (path, code) => {
        console.log(
          `[Background AI] Finished file ${path} for project ${projectId}.`,
        );

        /*
         * IMPORTANT:
         *
         * We intentionally fetch the latest project first,
         * modify the complete Mixed "files" object, and save it.
         *
         * Your Project schema stores "files" as Schema.Types.Mixed.
         * This avoids MongoDB dot-notation problems with filenames
         * such as:
         *
         * /App.js
         * /components/Hero.js
         * /styles.css
         *
         * The generation concurrency should be kept low (2)
         * in ai.js so these updates don't overwrite each other.
         */

        const project = await Project.findById(projectId);

        if (!project) {
          console.error(
            `[Background AI] Project ${projectId} not found while saving ${path}.`,
          );
          return;
        }

        // Make sure files is an object.
        if (!project.files || typeof project.files !== "object") {
          project.files = {};
        }

        // Add/update generated file.
        project.files[path] = {
          content: code,
          hash: hashContent(code),
        };

        // Prevent duplicate paths.
        const generatedFiles = Array.isArray(project.filesGenerated)
          ? project.filesGenerated
          : [];

        if (!generatedFiles.includes(path)) {
          project.filesGenerated.push(path);
        }

        // Add progress message.
        project.messages.push({
          role: "assistant",
          content: `Created file "${path}"`,
          timestamp: new Date(),
        });

        // Do not leave currentFile stuck if this file finishes.
        project.currentFile = null;

        // Tell Mongoose that the Mixed field changed.
        project.markModified("files");

        await project.save();

        console.log(
          `[Background AI] Saved ${path} successfully. ` +
            `Generated ${project.filesGenerated.length}/` +
            `${project.filesPlanned.length} files.`,
        );
      },
    });

    // ----------------------------------------------------------
    // GENERATION COMPLETED
    // ----------------------------------------------------------

    console.log(`[Background AI] Successfully generated project ${projectId}.`);

    const project = await Project.findById(projectId);

    if (!project) {
      console.error(
        `[Background AI] Project ${projectId} disappeared after generation.`,
      );
      return;
    }

    project.status = "completed";
    project.version = 1;
    project.currentFile = null;

    if (result?.description) {
      project.name = result.description;
    }

    project.messages.push({
      role: "assistant",
      content: "Website generation complete! You can view and edit the files.",
      timestamp: new Date(),
    });

    await project.save();

    console.log(`[Background AI] Project ${projectId} marked as completed.`);
  } catch (err) {
    console.error(
      `[Background AI] Fatal generation error for project ${projectId}:`,
      err,
    );

    await Project.findByIdAndUpdate(
      projectId,
      {
        $set: {
          status: "failed",
          error: err.message || "Unknown generation error",
          currentFile: null,
        },
        $push: {
          messages: {
            role: "assistant",
            content: `❌ Generation failed: ${err.message || "Unknown error"}`,
            timestamp: new Date(),
          },
        },
      },
      {
        new: true,
      },
    );
  }
}

// ============================================================
// GET /api/projects
// List all projects owned by the user.
// Summary only — no file contents.
// ============================================================

export async function listProjects(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "Unauthorized",
      });
      return;
    }

    const projects = await Project.find(
      {
        owner: req.user.userId,
      },
      {
        name: 1,
        description: 1,
        version: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    ).sort({
      updatedAt: -1,
    });

    res.json(projects);
  } catch (err) {
    console.error("[List Projects] Error:", err);

    res.status(500).json({
      error: err.message || "Failed to load projects",
    });
  }
}

// ============================================================
// GET /api/projects/:id
// Get full project details.
// ============================================================

export async function getProject(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "Unauthorized",
      });
      return;
    }

    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.userId,
    });

    if (!project) {
      res.status(404).json({
        error: "Project not found",
      });
      return;
    }

    const filesObj = getFilesObject(project.files);

    res.json({
      _id: project._id,
      name: project.name,
      description: project.description,
      files: filesObj,
      messages: project.messages,
      version: project.version,
      status: project.status,
      filesPlanned: project.filesPlanned,
      filesGenerated: project.filesGenerated,
      currentFile: project.currentFile,
      error: project.error,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  } catch (err) {
    console.error("[Get Project] Error:", err);

    res.status(500).json({
      error: err.message || "Failed to load project",
    });
  }
}

// ============================================================
// DELETE /api/projects/:id
// Delete a project.
// ============================================================

export async function deleteProject(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "Unauthorized",
      });
      return;
    }

    const result = await Project.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.userId,
    });

    if (!result) {
      res.status(404).json({
        error: "Project not found",
      });
      return;
    }

    res.json({
      success: true,
    });
  } catch (err) {
    console.error("[Delete Project] Error:", err);

    res.status(500).json({
      error: err.message || "Failed to delete project",
    });
  }
}

// ============================================================
// PUT /api/projects/:id/files
// Update project files (manual edits).
// ============================================================

export async function updateProjectFiles(req, res) {
  try {
    const { files } = req.body;

    if (!files || typeof files !== "object") {
      res.status(400).json({
        error: "files object is required",
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        error: "Unauthorized",
      });
      return;
    }

    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.userId,
    });

    if (!project) {
      res.status(404).json({
        error: "Project not found",
      });
      return;
    }

    // Rebuild project files map with content + hashes.
    const newFiles = {};

    for (const [path, content] of Object.entries(files)) {
      if (typeof content === "string") {
        newFiles[path] = {
          content,
          hash: hashContent(content),
        };
      }
    }

    project.files = newFiles;
    project.markModified("files");

    await project.save();

    const filesObj = getFilesObject(project.files);

    res.json({
      _id: project._id,
      name: project.name,
      description: project.description,
      files: filesObj,
      messages: project.messages,
      version: project.version,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  } catch (err) {
    console.error("[Update Project Files] Error:", err);

    res.status(500).json({
      error: err.message || "Failed to update project files",
    });
  }
}

// ============================================================
// POST /api/projects/:id/publish
// Mark a project as publicly published.
// ============================================================

export async function publishProject(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "Unauthorized",
      });
      return;
    }

    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user.userId,
      },
      {
        $set: {
          published: true,
        },
      },
      {
        new: true,
      },
    );

    if (!project) {
      res.status(404).json({
        error: "Project not found",
      });
      return;
    }

    res.json({
      success: true,
      published: project.published,
    });
  } catch (err) {
    console.error("[Publish Project] Error:", err);

    res.status(500).json({
      error: err.message || "Failed to publish project",
    });
  }
}

// ============================================================
// GET /api/projects/public/:id
// Get publicly published project details.
// ============================================================

export async function getPublicProject(req, res) {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      res.status(404).json({
        error: "Project not found",
      });
      return;
    }

    if (!project.published) {
      res.status(403).json({
        error: "Project is not published yet",
      });
      return;
    }

    const filesObj = getFilesObject(project.files);

    res.json({
      _id: project._id,
      name: project.name,
      description: project.description,
      files: filesObj,
      version: project.version,
    });
  } catch (err) {
    console.error("[Get Public Project] Error:", err);

    res.status(500).json({
      error: err.message || "Failed to load public project",
    });
  }
}
