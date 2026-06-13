import { Octokit } from 'octokit';
import simpleGit from 'simple-git';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * GitHub operations for GitHub file source mode.
 * Clones repos, creates branches, pushes changes, and creates pull requests.
 */

/**
 * Clone a GitHub repo to a local working directory.
 */
export async function cloneRepo(repoUrl, token, targetDir) {
  const octokit = new Octokit({ auth: token });
  const authenticatedUrl = repoUrl.replace('https://', `https://x-access-token:${token}@`);

  if (fs.existsSync(targetDir)) {
    const git = simpleGit(targetDir);
    await git.pull('origin', 'main');
    return;
  }

  execSync(`git clone ${authenticatedUrl} ${targetDir}`, { encoding: 'utf-8' });
}

/**
 * Create a new branch for Memex changes.
 */
export function createBranch(localPath, branchName) {
  const git = simpleGit(localPath);
  return git.checkoutLocalBranch(branchName);
}

/**
 * Push a branch to GitHub.
 */
export async function pushBranch(localPath, branchName) {
  const git = simpleGit(localPath);
  await git.push('origin', branchName);
}

/**
 * Create a pull request via GitHub API.
 */
export async function createPullRequest(token, repoOwner, repoName, branchName, title, body) {
  const octokit = new Octokit({ auth: token });

  // Ensure 'memex' label exists
  try {
    await octokit.rest.issues.getLabel({ owner: repoOwner, repo: repoName, name: 'memex' });
  } catch {
    await octokit.rest.issues.createLabel({
      owner: repoOwner, repo: repoName, name: 'memex', color: '7c3aed',
    });
  }

  const pr = await octokit.rest.pulls.create({
    owner: repoOwner,
    repo: repoName,
    title,
    body,
    head: branchName,
    base: 'main',
    labels: ['memex'],
  });

  return { pr_url: pr.data.html_url, pr_number: pr.data.number };
}

/**
 * Full GitHub write flow: pull, create branch, write file, commit, push, create PR.
 */
export async function githubWriteFlow(project, filePath, content, taskDescription, aiName, decisions, watchOut) {
  const repoUrl = project.github_repo;
  const token = project.github_token;
  const localPath = project.local_path;

  // Parse owner/repo from URL
  const match = repoUrl.match(/github\.com[/:](\w+)\/(\w+)/);
  if (!match) throw new Error('Invalid GitHub URL');
  const [, repoOwner, repoName] = match;

  // Pull latest
  const git = simpleGit(localPath);
  await git.pull('origin', 'main');

  // Create branch
  const timestamp = Date.now();
  const branchName = `memex/${taskDescription.toLowerCase().replace(/\s+/g, '-').slice(0, 50)}-${timestamp}`;
  await createBranch(localPath, branchName);

  // Write file
  const fullPath = path.join(localPath, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');

  // Commit
  execSync('git add -A', { cwd: localPath });
  execSync(`git commit -m "memex: ${taskDescription} by ${aiName}"`, { cwd: localPath });

  // Push
  await pushBranch(localPath, branchName);

  // Create PR
  const changelogBody = formatPrBody(taskDescription, aiName, decisions, watchOut);
  const pr = await createPullRequest(token, repoOwner, repoName, branchName, taskDescription, changelogBody);

  return pr;
}

/**
 * Format the PR body with full changelog entry.
 */
function formatPrBody(taskDescription, aiName, decisions, watchOut) {
  let body = `## Memex Change\n\n`;
  body += `**AI:** ${aiName}\n`;
  body += `**Task:** ${taskDescription}\n\n`;

  if (decisions?.length) {
    body += `### Decisions Made\n`;
    decisions.forEach(d => { body += `- ${d}\n`; });
    body += `\n`;
  }

  if (watchOut?.length) {
    body += `### Watch Out\n`;
    watchOut.forEach(w => { body += `- ${w}\n`; });
    body += `\n`;
  }

  body += `---\n*Created by Memex — Multi-AI development workspace*`;
  return body;
}
