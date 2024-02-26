import * as core from '@actions/core';
import * as exec from '@actions/exec';

import * as lib from '../src/lib';

jest.mock('@actions/core');
jest.mock('@actions/exec');

describe('getStagedFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses git diff-index output', async () => {
    jest.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 0,
      stdout: `
:100644 000000 f0dd2376c3d11c2cffa7509872ff1a4b740d77bb 0000000000000000000000000000000000000000 D	deleted-file
:000000 100644 0000000000000000000000000000000000000000 e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 A	dir/added-file
:100644 100755 7cc89b60c3b63715e95b87d89c652ae6115b1d2f 7cc89b60c3b63715e95b87d89c652ae6115b1d2f M	dir/modified-file
:000000 100644 0000000000000000000000000000000000000000 e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 A	added-file
:100644 100644 35d500927be0285515869e9f43f9b23726e76991 6fa2e97fe3873cd173ba0428b1d14d307242b0ca M	modified-file`,
      stderr: ''
    });

    await expect(lib.getStagedFiles()).resolves.toStrictEqual([
      {
        change: 'D',
        filename: 'deleted-file',
        mode: '000000',
        oldMode: '100644',
        oldSha: 'f0dd2376c3d11c2cffa7509872ff1a4b740d77bb',
        sha: '0000000000000000000000000000000000000000'
      },
      {
        change: 'A',
        filename: 'dir/added-file',
        mode: '100644',
        oldMode: '000000',
        oldSha: '0000000000000000000000000000000000000000',
        sha: 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391'
      },
      {
        change: 'M',
        filename: 'dir/modified-file',
        mode: '100755',
        oldMode: '100644',
        oldSha: '7cc89b60c3b63715e95b87d89c652ae6115b1d2f',
        sha: '7cc89b60c3b63715e95b87d89c652ae6115b1d2f'
      },
      {
        change: 'A',
        filename: 'added-file',
        mode: '100644',
        oldMode: '000000',
        oldSha: '0000000000000000000000000000000000000000',
        sha: 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391'
      },
      {
        change: 'M',
        filename: 'modified-file',
        mode: '100644',
        oldMode: '100644',
        oldSha: '35d500927be0285515869e9f43f9b23726e76991',
        sha: '6fa2e97fe3873cd173ba0428b1d14d307242b0ca'
      }
    ]);
  });

  it('is not silent in debug mode', async () => {
    jest.mocked(core.isDebug).mockReturnValue(true);
    jest
      .mocked(exec.getExecOutput)
      .mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

    await lib.getStagedFiles();

    expect(exec.getExecOutput).toHaveBeenCalledWith(
      'git',
      expect.anything(),
      expect.objectContaining({
        silent: false
      })
    );
  });
});

describe('getHeadRef', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('strips prefix', async () => {
    jest.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 0,
      stdout: 'refs/heads/main',
      stderr: ''
    });

    await expect(lib.getHeadRef()).resolves.toEqual('main');
  });

  it('trims output', async () => {
    jest.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 0,
      stdout: 'refs/heads/main\n',
      stderr: ''
    });

    await expect(lib.getHeadRef()).resolves.toEqual('main');
  });

  it('throws an error on unexpected output', async () => {
    jest.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 0,
      stdout: 'foobar',
      stderr: ''
    });

    await expect(lib.getHeadRef()).rejects.toThrow();
  });

  it('is not silent in debug mode', async () => {
    jest.mocked(core.isDebug).mockReturnValue(true);
    jest.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 0,
      stdout: 'refs/heads/main',
      stderr: ''
    });

    await lib.getHeadRef();

    expect(exec.getExecOutput).toHaveBeenCalledWith(
      'git',
      expect.anything(),
      expect.objectContaining({
        silent: false
      })
    );
  });
});

describe('getHeadSha', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trims output', async () => {
    jest.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 0,
      stdout: 'deadbeef\n',
      stderr: ''
    });

    await expect(lib.getHeadSha()).resolves.toEqual('deadbeef');
  });

  it('is not silent in debug mode', async () => {
    jest.mocked(core.isDebug).mockReturnValue(true);
    jest
      .mocked(exec.getExecOutput)
      .mockResolvedValue({ exitCode: 0, stdout: 'sha', stderr: '' });

    await lib.getHeadSha();

    expect(exec.getExecOutput).toHaveBeenCalledWith(
      'git',
      expect.anything(),
      expect.objectContaining({
        silent: false
      })
    );
  });
});

describe('getHeadTreeHash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trims output', async () => {
    jest.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 0,
      stdout: 'deadbeef\n',
      stderr: ''
    });

    await expect(lib.getHeadTreeHash()).resolves.toEqual('deadbeef');
  });

  it('is not silent in debug mode', async () => {
    jest.mocked(core.isDebug).mockReturnValue(true);
    jest
      .mocked(exec.getExecOutput)
      .mockResolvedValue({ exitCode: 0, stdout: 'sha', stderr: '' });

    await lib.getHeadTreeHash();

    expect(exec.getExecOutput).toHaveBeenCalledWith(
      'git',
      expect.anything(),
      expect.objectContaining({
        silent: false
      })
    );
  });
});
