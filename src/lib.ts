import * as core from '@actions/core';
import * as exec from '@actions/exec';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function getStagedFiles() {
  const { stdout } = await exec.getExecOutput(
    'git',
    ['diff-index', '--cached', 'HEAD'],
    {
      silent: !core.isDebug()
    }
  );

  const matches = stdout.matchAll(
    /^:(?<oldMode>\d{6})\s(?<mode>\d{6})\s(?<oldSha>\w+)\s(?<sha>\w+)\s(?<change>\w)\s(?<filename>.*)$/gm
  );

  return Array.from(matches).map(match => {
    const { oldMode, mode, oldSha, sha, change, filename } = match.groups as {
      oldMode: '000000' | '100644' | '100755' | '040000' | '160000' | '120000';
      mode: '000000' | '100644' | '100755' | '040000' | '160000' | '120000';
      oldSha: string;
      sha: string;
      change: 'A' | 'D' | 'M';
      filename: string;
    };
    return { oldMode, mode, oldSha, sha, change, filename };
  });
}

export async function getHeadRef(): Promise<string> {
  const { stdout } = await exec.getExecOutput(
    'git',
    ['rev-parse', '--symbolic-full-name', 'HEAD'],
    {
      silent: !core.isDebug()
    }
  );

  if (!stdout.startsWith('refs/heads/')) {
    throw new Error(`Unexpected output from \`git rev-parse\`: ${stdout}`);
  }

  return stdout.trim().slice('refs/heads/'.length);
}

export async function getHeadSha(): Promise<string> {
  const { stdout } = await exec.getExecOutput('git', ['rev-parse', 'HEAD'], {
    silent: !core.isDebug()
  });

  return stdout.trim();
}

export async function getHeadTreeHash(): Promise<string> {
  const { stdout } = await exec.getExecOutput(
    'git',
    ['log', '-1', '--format=%T', 'HEAD'],
    {
      silent: !core.isDebug()
    }
  );

  return stdout.trim();
}
