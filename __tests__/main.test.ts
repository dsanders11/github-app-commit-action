import * as fs from 'node:fs';

import * as core from '@actions/core';
import { RequestError } from '@octokit/request-error';

import * as lib from '../src/lib';
import * as main from '../src/main';
import { mockGetInput } from './utils';

const createCommit = jest.fn();
const createRef = jest.fn();
const createTree = jest.fn();
const updateRef = jest.fn();

jest.mock('node:fs');
jest.mock('@actions/core');
jest.mock('@actions/github', () => {
  return {
    context: {
      repo: {
        owner: 'electron',
        repo: 'electron'
      }
    },
    getOctokit: jest.fn(() => ({
      rest: {
        git: {
          createCommit,
          createRef,
          createTree,
          updateRef
        }
      }
    }))
  };
});
jest.mock('../src/lib');

function createMockRequestError(message: string, statusCode: number): Error {
  const error = Object.create(RequestError.prototype);
  return Object.assign(error, {
    message,
    name: 'HttpError',
    status: statusCode
  });
}

// Spy the action's entrypoint
const runSpy = jest.spyOn(main, 'run');

describe('action', () => {
  const message = 'Test commit';
  const token = 'fake-token';
  const stagedFiles = [
    {
      change: 'A' as const,
      filename: 'added-file',
      mode: '100644' as const,
      oldMode: '000000' as const,
      oldSha: '0000000000000000000000000000000000000000',
      sha: 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(lib.getHeadRef).mockReset();
  });

  it('requires the message input', async () => {
    mockGetInput({});

    await main.run();
    expect(runSpy).toHaveReturned();

    expect(core.setFailed).toHaveBeenCalledTimes(1);
    expect(core.setFailed).toHaveBeenLastCalledWith(
      'Input required and not supplied: message'
    );
  });

  it('requires the token input', async () => {
    mockGetInput({ message });

    await main.run();
    expect(runSpy).toHaveReturned();

    expect(core.setFailed).toHaveBeenCalledTimes(1);
    expect(core.setFailed).toHaveBeenLastCalledWith(
      'Input required and not supplied: token'
    );
  });

  it('defaults to HEAD ref', async () => {
    const ref = 'main';
    const commitSha = 'commit-sha';
    const headTreeHash = 'head-tree-hash';

    mockGetInput({ message, token });
    jest.mocked(lib.getHeadRef).mockResolvedValue(ref);
    jest.mocked(lib.getHeadSha).mockResolvedValue('head-sha');
    jest.mocked(lib.getHeadTreeHash).mockResolvedValue(headTreeHash);
    jest.mocked(lib.getStagedFiles).mockResolvedValue(stagedFiles);
    jest.mocked(createTree).mockResolvedValue({ data: { sha: 'tree-sha' } });
    jest.mocked(createCommit).mockResolvedValue({ data: { sha: commitSha } });
    jest.mocked(updateRef).mockResolvedValue({ data: {} });

    await main.run();
    expect(runSpy).toHaveReturned();

    expect(lib.getHeadRef).toHaveBeenCalled();
    expect(createTree).toHaveBeenCalledWith(
      expect.objectContaining({
        base_tree: headTreeHash
      })
    );
    expect(createCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        parents: ['head-sha'],
        tree: 'tree-sha'
      })
    );
    expect(updateRef).toHaveBeenCalledWith(
      expect.objectContaining({
        sha: commitSha,
        ref: `heads/${ref}`
      })
    );

    expect(core.setOutput).toHaveBeenCalledTimes(1);
    expect(core.setOutput).toHaveBeenLastCalledWith('sha', commitSha);
  });

  it('uses user-supplied ref', async () => {
    const ref = 'foobar';
    const commitSha = 'commit-sha';
    const headTreeHash = 'head-tree-hash';

    mockGetInput({ message, token, ref });
    jest.mocked(lib.getHeadSha).mockResolvedValue('head-sha');
    jest.mocked(lib.getHeadTreeHash).mockResolvedValue(headTreeHash);
    jest.mocked(lib.getStagedFiles).mockResolvedValue(stagedFiles);
    jest.mocked(createTree).mockResolvedValue({ data: { sha: 'tree-sha' } });
    jest.mocked(createCommit).mockResolvedValue({ data: { sha: commitSha } });
    jest.mocked(updateRef).mockResolvedValue({ data: {} });

    await main.run();
    expect(runSpy).toHaveReturned();

    expect(lib.getHeadRef).not.toHaveBeenCalled();
    expect(createTree).toHaveBeenCalledWith(
      expect.objectContaining({
        base_tree: headTreeHash
      })
    );
    expect(createCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        parents: ['head-sha'],
        tree: 'tree-sha'
      })
    );
    expect(updateRef).toHaveBeenCalledWith(
      expect.objectContaining({
        sha: commitSha,
        ref: `heads/${ref}`
      })
    );

    expect(core.setOutput).toHaveBeenCalledTimes(1);
    expect(core.setOutput).toHaveBeenLastCalledWith('sha', commitSha);
  });

  it('updates existing ref', async () => {
    const ref = 'main';
    const commitSha = 'commit-sha';

    mockGetInput({ message, token });
    jest.mocked(lib.getHeadRef).mockResolvedValue(ref);
    jest.mocked(lib.getHeadSha).mockResolvedValue('head-sha');
    jest.mocked(lib.getHeadTreeHash).mockResolvedValue('head-tree-hash');
    jest.mocked(lib.getStagedFiles).mockResolvedValue(stagedFiles);
    jest.mocked(createTree).mockResolvedValue({ data: { sha: 'tree-sha' } });
    jest.mocked(createCommit).mockResolvedValue({ data: { sha: commitSha } });
    jest.mocked(updateRef).mockResolvedValue({ data: {} });

    await main.run();
    expect(runSpy).toHaveReturned();

    expect(lib.getHeadRef).toHaveBeenCalled();
    expect(updateRef).toHaveBeenCalled();
    expect(createRef).not.toHaveBeenCalled();
  });

  it('creates new ref', async () => {
    const ref = 'branch';
    const commitSha = 'commit-sha';

    mockGetInput({ message, token, ref });
    jest.mocked(lib.getHeadRef).mockResolvedValue('main');
    jest.mocked(lib.getHeadSha).mockResolvedValue('head-sha');
    jest.mocked(lib.getHeadTreeHash).mockResolvedValue('head-tree-hash');
    jest.mocked(lib.getStagedFiles).mockResolvedValue(stagedFiles);
    jest.mocked(createTree).mockResolvedValue({ data: { sha: 'tree-sha' } });
    jest.mocked(createCommit).mockResolvedValue({ data: { sha: commitSha } });
    jest
      .mocked(updateRef)
      .mockRejectedValue(
        createMockRequestError(
          'Reference does not exist - https://docs.github.com/rest/git/refs#update-a-reference',
          422
        )
      );

    await main.run();
    expect(runSpy).toHaveReturned();

    expect(lib.getHeadRef).not.toHaveBeenCalled();
    expect(updateRef).toHaveBeenCalledWith(
      expect.objectContaining({
        sha: commitSha,
        ref: `heads/${ref}`
      })
    );
    expect(createRef).toHaveBeenCalledWith(
      expect.objectContaining({
        sha: commitSha,
        ref: `refs/heads/${ref}`
      })
    );
  });

  it('rethrows other errors on updateRef', async () => {
    const ref = 'branch';
    const commitSha = 'commit-sha';

    mockGetInput({ message, token, ref });
    jest.mocked(lib.getHeadRef).mockResolvedValue('main');
    jest.mocked(lib.getHeadSha).mockResolvedValue('head-sha');
    jest.mocked(lib.getHeadTreeHash).mockResolvedValue('head-tree-hash');
    jest.mocked(lib.getStagedFiles).mockResolvedValue(stagedFiles);
    jest.mocked(createTree).mockResolvedValue({ data: { sha: 'tree-sha' } });
    jest.mocked(createCommit).mockResolvedValue({ data: { sha: commitSha } });
    jest.mocked(updateRef).mockRejectedValue(new Error('Server error'));

    await main.run();
    expect(runSpy).toHaveReturned();

    expect(lib.getHeadRef).not.toHaveBeenCalled();
    expect(updateRef).toHaveBeenCalled();
    expect(createRef).not.toHaveBeenCalled();

    expect(core.setFailed).toHaveBeenCalledTimes(1);
    expect(core.setFailed).toHaveBeenLastCalledWith('Server error');
  });

  it('errors if no changes to commit', async () => {
    mockGetInput({ message, token });
    jest.mocked(lib.getStagedFiles).mockResolvedValue([]);

    await main.run();
    expect(runSpy).toHaveReturned();

    expect(core.setFailed).toHaveBeenCalledTimes(1);
    expect(core.setFailed).toHaveBeenLastCalledWith(
      'No changes found to commit'
    );
  });

  it('handles generic errors', async () => {
    mockGetInput({ message, token });
    jest.mocked(lib.getStagedFiles).mockImplementation(() => {
      throw new Error('Server error');
    });

    await main.run();
    expect(runSpy).toHaveReturned();

    expect(core.setFailed).toHaveBeenCalledTimes(1);
    expect(core.setFailed).toHaveBeenLastCalledWith('Server error');
  });

  it('stringifies non-errors', async () => {
    mockGetInput({ message, token });
    jest.mocked(lib.getStagedFiles).mockImplementation(() => {
      throw 42; // eslint-disable-line no-throw-literal
    });

    await main.run();
    expect(runSpy).toHaveReturned();

    expect(core.setFailed).toHaveBeenCalledTimes(1);
    expect(core.setFailed).toHaveBeenLastCalledWith('42');
  });
});

describe('populateTree', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle added files', async () => {
    const filename = 'added-file';
    const content = 'foobar';
    const mode = '100644';

    jest.mocked(lib.getStagedFiles).mockResolvedValue([
      {
        change: 'A',
        filename,
        mode,
        oldMode: '000000',
        oldSha: '0000000000000000000000000000000000000000',
        sha: 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391'
      }
    ]);
    jest.mocked(fs.readFileSync).mockReturnValue(content);

    await expect(main.populateTree()).resolves.toStrictEqual([
      {
        path: filename,
        mode,
        type: 'blob',
        content
      }
    ]);
  });

  it('should handle deleted files', async () => {
    const filename = 'deleted-file';
    const mode = '100644';

    jest.mocked(lib.getStagedFiles).mockResolvedValue([
      {
        change: 'D',
        filename,
        mode: '000000',
        oldMode: mode,
        oldSha: 'f0dd2376c3d11c2cffa7509872ff1a4b740d77bb',
        sha: '0000000000000000000000000000000000000000'
      }
    ]);

    await expect(main.populateTree()).resolves.toStrictEqual([
      {
        path: filename,
        mode,
        type: 'blob',
        sha: null
      }
    ]);
  });

  it('should handle modified files', async () => {
    const filename = 'modified-file';
    const content = 'foobar';
    const mode = '100644';

    jest.mocked(lib.getStagedFiles).mockResolvedValue([
      {
        change: 'M',
        filename,
        mode,
        oldMode: mode,
        oldSha: '35d500927be0285515869e9f43f9b23726e76991',
        sha: '6fa2e97fe3873cd173ba0428b1d14d307242b0ca'
      }
    ]);
    jest.mocked(fs.readFileSync).mockReturnValue(content);

    await expect(main.populateTree()).resolves.toStrictEqual([
      {
        path: filename,
        mode,
        type: 'blob',
        content
      }
    ]);
  });

  it('should handle mode changes', async () => {
    const filename = 'modified-file';
    const mode = '100755';
    const sha = '7cc89b60c3b63715e95b87d89c652ae6115b1d2f';

    jest.mocked(lib.getStagedFiles).mockResolvedValue([
      {
        change: 'M',
        filename,
        mode,
        oldMode: '100644',
        oldSha: sha,
        sha
      }
    ]);

    await expect(main.populateTree()).resolves.toStrictEqual([
      {
        path: filename,
        mode,
        type: 'blob',
        sha
      }
    ]);
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });

  it('errors on unexpected mode for deleted file', async () => {
    jest.mocked(lib.getStagedFiles).mockResolvedValue([
      {
        change: 'D',
        filename: 'deleted-file',
        mode: '000000',
        oldMode: '000000',
        oldSha: 'f0dd2376c3d11c2cffa7509872ff1a4b740d77bb',
        sha: '0000000000000000000000000000000000000000'
      }
    ]);

    await expect(main.populateTree()).rejects.toThrow(
      'Unexpected mode for deleted file'
    );
  });

  it('errors on unexpected mode for added file', async () => {
    jest.mocked(lib.getStagedFiles).mockResolvedValue([
      {
        change: 'A',
        filename: 'added-file',
        mode: '000000',
        oldMode: '000000',
        oldSha: '0000000000000000000000000000000000000000',
        sha: 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391'
      }
    ]);

    await expect(main.populateTree()).rejects.toThrow(
      'Unexpected mode for file'
    );
  });
});
