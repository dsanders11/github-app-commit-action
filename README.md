# GitHub App Commit Action

[![GitHub Super-Linter](https://github.com/dsanders11/github-app-commit-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
[![CI](https://github.com/dsanders11/github-app-commit-action/actions/workflows/ci.yml/badge.svg)](https://github.com/electron/github-app-auth-action/actions/workflows/ci.yml)

> GitHub Action which makes it simple to make verified Git commits as a GitHub
> app

## Usage

### Authentication

This action requires a GitHub app installation token. An authentication token
for the app can be easily generated in the GitHub Actions workflow using
[`electron/github-app-auth-action`](https://github.com/electron/github-app-auth-action)
. The app must have the "Contents" (read and write) permission and be installed
on the repository.

### Staging Changes

Stage changes for the commit as you normally would, but to commit them use the
action instead of running `git commit`. The changes to commit will be detected
automatically.

### Updating Existing Ref

If you want to update an existing ref, you should ensure that ref is checked out
in the current Git checkout (you can use the `ref` input for
`actions/checkout`). You can force the update using the `force` input.

### Multiple Commits

If you want to make multiple commits one after the other, be sure to run a
`git pull` after using the action so that the working tree is up-to-date before
the next commit.

### Example

```yaml
jobs:
  commit-changes:
    name: Commit changes
    runs-on: ubuntu-latest
    steps:
      - name: Generate GitHub App token
        uses: electron/github-app-auth-action@v1.1.1
        id: generate-token
        with:
          creds: ${{ secrets.GH_APP_CREDS }}
      - name: Checkout
        id: checkout
        uses: actions/checkout@v4.1.1
      - name: Stage changes
        run: |
          echo 'Hello World' > hello-world.txt
          git add hello-world.txt
      - name: Commit
        uses: dsanders11/github-app-commit-action@v1
        with:
          message: 'feat: my changes'
          token: ${{ steps.generate-token.outputs.token }}
```

### Inputs

- `fail-on-no-changes` - _(optional)_ Whether or not to set action failure if
  there are no changes to commit (default: `true`)
- `force` - _(optional)_ Whether to force the update or to make sure the update
  is a fast-forward update when updating an existing ref (default: `false`)
- `message` - **(required)** The commit message
- `owner` - _(optional)_ The owner of the GitHub repository. Defaults to the
  owner of the repository this action is running in.
- `ref` - _(optional)_ Git reference to associate the commit with (e.g. `main`).
  If it does not exist it will be created. Defaults to the the current checkout
  ref.
- `repository` - _(optional)_ The GitHub repository to commit to. Defaults to
  the repository this action is running in.
- `token` - **(required)** GitHub App installation access token
- `working-directory` - _(optional)_ The working directory. Defaults to the
  current working directory.

### Outputs

- `message` - The commit message
- `ref` - The associated Git reference
- `ref-operation` - Which operation was performed on the ref: `created` or
  `updated`. Has no value if there were no changes to commit.
- `sha` - SHA for the commit

## License

MIT
