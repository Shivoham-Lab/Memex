import { summarizeFile } from './summarizer.js';
import { enrichChangelog } from './enricher.js';
import { suggestSnapshotUpdate } from './snapshotAdvisor.js';

/** In-memory job queue for Ollama tasks */
class JobQueue {
  constructor() {
    this.jobs = [];
    this.processing = false;
    this.interval = null;
  }

  /** Start the queue processor */
  start() {
    if (this.interval) return;
    this.interval = setInterval(() => this.processNext(), 1000);
  }

  /** Stop the queue processor */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /** Add a job to the queue */
  add(jobFn) {
    this.jobs.push(jobFn);
    this.start();
  }

  /** Process the next job */
  async processNext() {
    if (this.processing || this.jobs.length === 0) return;
    this.processing = true;
    const job = this.jobs.shift();
    try {
      await job();
    } catch (error) {
      console.error('Job queue error:', error.message);
    } finally {
      this.processing = false;
      if (this.jobs.length === 0) this.stop();
    }
  }

  /** Get queue status */
  getStatus() {
    return { pending: this.jobs.length, processing: this.processing };
  }
}

export const jobQueue = new JobQueue();

/** Queue a file summarization job */
export function queueFileSummary(projectId, projectPath, filePath, content, thinkingModel) {
  jobQueue.add(() => summarizeFile(projectId, projectPath, filePath, content, thinkingModel));
}

/** Queue a changelog enrichment job */
export function queueChangelogEnrichment(projectId, projectPath, diff, entry, thinkingModel) {
  jobQueue.add(() => enrichChangelog(projectId, projectPath, diff, entry, thinkingModel));
}

/** Queue a snapshot update suggestion job */
export function queueSnapshotUpdate(projectId, projectPath, thinkingModel) {
  jobQueue.add(() => suggestSnapshotUpdate(projectId, projectPath, thinkingModel));
}

/** Get queue status (alias for dashboard routes) */
export function getQueueStatus() {
  return jobQueue.getStatus();
}
