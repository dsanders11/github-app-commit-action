import * as fs from 'node:fs';
import * as path from 'node:path';

import * as core from '@actions/core';
import * as github from '@actions/github';

import { RequestError } from '@octokit/request-error';
import type { Endpoints } from '@octokit/types';

import { getHeadRef, getHeadSha, getHeadTreeHash, getStagedFiles } from './lib';

export async function populateTree(): Promise<
  Endpoints['POST /repos/{owner}/{repo}/git/trees']['parameters']['tree']
> {
  return (await getStagedFiles()).map(
    ({ oldMode, mode, oldSha, sha, change, filename }) => {
      if (change === 'D') {
        // Keep TS happy with this check
        if (oldMode === '000000') {
          throw new Error('Unexpected mode for deleted file');
        }

        return {
          path: filename,
          mode: oldMode,
          type: 'blob',
          sha: null
        };
      }

      // Keep TS happy with this check
      if (mode === '000000') {
        throw new Error('Unexpected mode for file');
      }

      if (oldSha === sha) {
        // This is probably a mode change (file made executable),
        // since the content hasn't changed, don't send it
        return {
          path: filename,
          mode,
          type: 'blob',
          sha
        };
      } else {
        return {
          path: filename,
          mode,
          type: 'blob',
          content: fs.readFileSync(path.join(process.cwd(), filename), 'utf-8')
        };
      }
    }
  );
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // Required inputs
    const message = core.getInput('message', { required: true });
    const token = core.getInput('token', { required: true });

    // Optional inputs
    const ref = `heads/${core.getInput('ref') || (await getHeadRef())}`;
    const failOnNoChanges = core.getBooleanInput('fail-on-no-changes');
    const force = core.getBooleanInput('force');

    const tree = await populateTree();

    if (tree.length === 0) {
      if (failOnNoChanges) {
        core.setFailed('No changes found to commit');
      } else {
        core.notice('No changes found to commit - skipping');
      }
      return;
    }

    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    const octokit = github.getOctokit(token, { log: console });

    const newTree = await octokit.rest.git.createTree({
      owner,
      repo,
      tree,
      base_tree: await getHeadTreeHash()
    });
    core.debug(`New tree SHA: ${newTree.data.sha}`);

    const newCommit = await octokit.rest.git.createCommit({
      owner,
      repo,
      parents: [await getHeadSha()],
      message,
      tree: newTree.data.sha
    });
    core.debug(`New commit SHA: ${newCommit.data.sha}`);

    try {
      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref,
        sha: newCommit.data.sha,
        force
      });
      core.debug(`Updated ref: ${ref} to ${newCommit.data.sha}`);
    } catch (err) {
      if (
        err instanceof RequestError &&
        err.status === 422 &&
        err.message.startsWith('Reference does not exist')
      ) {
        await octokit.rest.git.createRef({
          owner,
          repo,
          ref: `refs/${ref}`,
          sha: newCommit.data.sha
        });
        core.debug(`Created ref: ${ref} at ${newCommit.data.sha}`);
      } else {
        throw err;
      }
    }

    core.setOutput('sha', newCommit.data.sha);
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error && error.stack) core.debug(error.stack);
    core.setFailed(
      error instanceof Error ? error.message : JSON.stringify(error)
    );
  }
}
