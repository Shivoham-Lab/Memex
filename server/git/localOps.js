import simpleGit from 'simple-git';

/** Get simple-git instance for a project path */
function git(projectPath) {
  return simpleGit(projectPath);
}

/** Create pre-write checkpoint commit */
export async function checkpoint(projectPath, taskDescription, aiName) {
  const g = git(projectPath);
  await g.add('-A');
  const result = await g.commit(`memex-checkpoint: ${taskDescription} by ${aiName}`);
  return result.commit;
}

/** Create post-write commit */
export async function commit(projectPath, taskDescription, aiName) {
  const g = git(projectPath);
  await g.add('-A');
  const result = await g.commit(`memex: ${taskDescription} by ${aiName}`);
  return result.commit;
}

/** Create TODO completion commit */
export async function commitTodo(projectPath, todoTitle, aiName) {
  const g = git(projectPath);
  await g.add('-A');
  const result = await g.commit(`memex-todo: ${todoTitle} by ${aiName}`);
  return result.commit;
}

/** Rollback to a specific checkpoint by resetting to it */
export async function rollback(projectPath, checkpointHash) {
  const g = git(projectPath);
  await g.raw(['reset', '--hard', checkpointHash]);
  const result = await g.commit(`memex-rollback: reverted to checkpoint ${checkpointHash} by user`);
  return { success: true, commit: result.commit };
}

/** Get diff for a file between current state and a checkpoint */
export async function getFileDiff(projectPath, filePath, checkpointHash) {
  const g = git(projectPath);
  try {
    const diff = await g.diff([checkpointHash, 'HEAD', '--', filePath]);
    return diff;
  } catch {
    try {
      const content = await g.show([`${checkpointHash}:${filePath}`]);
      return `(File content at checkpoint ${checkpointHash}):\n${content}`;
    } catch {
      return `Unable to generate diff for ${filePath} at checkpoint ${checkpointHash}`;
    }
  }
}

/** Initialize git repo in project path if not already one */
export async function ensureGitRepo(projectPath) {
  const g = git(projectPath);
  try {
    await g.status();
  } catch {
    await g.init();
  }
}
