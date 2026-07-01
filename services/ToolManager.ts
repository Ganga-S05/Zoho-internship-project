const Type = require("@google/genai").Type;

const tools = [
  {
    functionDeclarations: [
      {
        name: "read_file",
        description:
          "Read a text file or source code file inside the workspace.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            path: {
              type: Type.STRING,
            },
          },
          required: ["path"],
        },
      },
      {
        name: "write_file",
        description:
          "Completely overwrites a file with the new content inside the current VS Code workspace. Use this ONLY when you want to replace everything or create a brand new file.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            path: {
              type: Type.STRING,
            },
            content: {
              type: Type.STRING,
              description:
                "The complete, entire text content to write to the file.",
            },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "append_file",
        description:
          "Appends/adds code or text to the very end of an existing file without deleting or modifying what is already there. Use this when the user explicitly asks to add, append, or attach content to an existing file.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            path: {
              type: Type.STRING,
            },
            content: {
              type: Type.STRING,
              description:
                "The new code snippet or text to append to the end of the file.",
            },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "get_current_time",
        description: "Retrieves the user's current local date and timestamp.",
      },
      {
        name: "replace_text",
        description:
          "Searches an existing file for a specified text and replaces all occurrences with the provided replacement text. Use this tool whenever the user requests a find-and-replace operation. Prefer this tool over read_file and write_file for text replacement tasks because it is safer and more efficient. Always provide search string with some surrounding context to avoid accidental mismatch.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            path: {
              type: Type.STRING,
              description: "The path of the file to modify.",
            },
            searchText: {
              type: Type.STRING,
              description:
                "The text to search for in the file. All occurrences of this text will be found and replaced. Always provide some surrounding line content too for proper replace.",
            },
            replaceText: {
              type: Type.STRING,
              description:
                "The new text that will replace every occurrence of the search text in the file.",
            },
          },
          required: ["path", "searchText", "replaceText"],
        },
      },
      {
        name: "rename_file",
        description:
          "Renames an existing file in the workspace by changing its current file name or path to a new file name or path. Use this tool when the user requests to rename, move, or change the name of a file while preserving its contents.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            Oldpath: {
              type: Type.STRING,
              description: "The path of old file name",
            },
            Newpath: {
              type: Type.STRING,
              description: "The path of new file name",
            },
          },
        },
      },
      {
        name: "Delete_file",
        description:
          "Deletes an existing file from the current workspace. Use this tool when the user explicitly requests to delete, remove, or permanently erase a file. Always confirm with the user before deleting because this action cannot be easily undone.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            path: {
              type: Type.STRING,
              description: "delete the current file path",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "list_files",
        description:
          "Lists all files and folders in the current workspace. Use this tool when you need to understand project structure before reading or editing files.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            path: {
              type: Type.STRING,
              description:
                "Optional folder path to scan. If not provided, scans entire workspace root.",
            },
            number: {
              type: Type.Number,
              description:
                "Recursively lists files and folders in a given directory path. Supports an optional depth parameter to limit how many levels of subdirectories are included in the output.",
            },
          },
          required: ["path"],
        },
      },
    ],
  },
];

export { tools };
