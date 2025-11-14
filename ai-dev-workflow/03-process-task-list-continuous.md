# Task List Management (Continuous Mode)

Guidelines for managing task lists in markdown files when we want steady, uninterrupted execution of PRD subtasks.

## Task Implementation
- **Continuous sub-task flow:** Work through subtasks sequentially without pausing for user confirmation between each one. Only stop if the user explicitly interrupts or new blocking info appears.
- **Completion protocol:**  
  1. When you finish a **sub-task**, immediately mark it `[x]`.
  2. If **all** subtasks for a parent are now `[x]`, do the following:
     - Run the full test suite (`pytest`, `npm test`, `bin/rails test`, etc.).
     - If tests pass: stage changes (`git add .`).
     - Clean up temporary files or debug code.
     - Commit using conventional commits and multi-`-m` flags, e.g.
       ```
       git commit -m "feat: add payment validation logic" -m "- Validates card type and expiry" -m "- Adds unit tests for edge cases" -m "Related to T123 in PRD"
       ```
  3. Mark the **parent task** `[x]` once its subtasks are committed.
- **Automatic progression:** After updating the task list for the completed sub-task, immediately begin the next pending sub-task.

## Task List Maintenance
1. **Update the file continuously:**
   - Check the task list before starting each sub-task.
   - Mark progress as soon as work is done.
   - Add new tasks when discoveries arise.
2. **Relevant Files section:**
   - Track every created or modified file with a one-line description.
   - Update descriptions as work evolves.

## AI Instructions
When processing task lists in continuous mode, the AI must:
1. Keep the task list current after any meaningful progress.
2. Follow the completion protocol—tests, staging, cleanup, commits—before closing parent tasks.
3. Add newly found tasks immediately.
4. Maintain the Relevant Files section accurately.
5. Proceed directly to the next sub-task with no confirmation prompt unless the user instructs otherwise.
6. Pause only for blocking issues, new requirements, or when the full task list is complete.
