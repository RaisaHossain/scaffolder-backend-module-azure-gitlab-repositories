# scaffolder-backend-module-Gitlab-repositories

Welcome to the GitLab repository actions for the `scaffolder-backend`.

This plugin contains a collection of actions:

- `gitlab:repo:clone`
- `gitlab:repo:push`
- `gitlab:repo:pr`

## Getting started

Create your Backstage application using the Backstage CLI as described here:
[https://backstage.io/docs/getting-started/create-an-app](https://backstage.io/docs/getting-started/create-an-app).

> Note: If you are using this plugin in a Backstage monorepo that contains the
> code for `@backstage/plugin-scaffolder-backend`, you need to modify your
> internal build processes to transpile files from the `node_modules` folder as
> well.

You need to configure the actions in your backend:

## From your Backstage root directory

```sh
# From your Backstage root directory
yarn add --cwd packages/backend @parfuemerie-douglas/scaffolder-backend-module-Gitlab-repositories
```

Configure the actions (you can check the
[docs](https://backstage.io/docs/features/software-templates/writing-custom-actions#registering-custom-actions)
to see all options):

```typescript
// packages/backend/src/plugins/scaffolder.ts

import {CatalogClient} from '@backstage/catalog-client';
import {ScmIntegrations} from "@backstage/integration";

import {
    cloneGitlabRepoAction,
    pushGitlabRepoAction,
    pullRequestGitlabRepoAction,
} from "@scaffolder-backend-module-azure-gitlab-repositories";

import {Router} from 'express';

import type {PluginEnvironment} from '../types';
import {cloneGitLabRepoAction} from "./cloneGitLabRepo";

export default async function createPlugin(
    env: PluginEnvironment,
): Promise<Router> {
    const catalogClient = new CatalogClient({
        discoveryApi: env.discovery,
    });

    const integrations = ScmIntegrations.fromConfig(env.config);

    const actions = [
        cloneGitLabRepoAction({integrations}),
        pushGitLabRepoAction({integrations, config: env.config}),
        pullRequestGitLabRepoAction({integrations}),
        ...createBuiltInActions({
            containerRunner,
            catalogClient,
            integrations,
            config: env.config,
            reader: env.reader,
        }),
    ];

    return await createRouter({
        containerRunner,
        catalogClient,
        actions,
        logger: env.logger,
        config: env.config,
        database: env.database,
        reader: env.reader,
    });
```

The GitLab repository actions use PAT(Personal Access Token). Simply add the PAT to your
`app-config.yaml`:

```yaml
# app-config.yaml

integrations:
  gitlab:
    - host: gitlab.com
      credentials:
        - personalAccessToken: ${GITLAB_ACCESS_TOKEN}
```

Read more on integrations in Backstage in the [Integrations
documentation](https://backstage.io/docs/integrations/).

## Using the template

After loading and configuring the GitLab repository template actions, you can use
the actions in your template:

```yaml
# template.yaml

apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: Gitlab-repo-demo
  title: GitLab Repository Test
  description: Clone and push to an Gitlab repository example.
spec:
  owner: Raisa Hossain
  type: service

  parameters:
    - title: Fill in some steps
      required:
        - name
        - owner
      properties:
        name:
          title: Project name
          type: string
          description: Choose a unique project name.
          ui:field: EntityNamePicker
          ui:autofocus: true
        owner:
          title: Owner
          type: string
          description: Select an owner for the Backstage component.
          ui:field: OwnerPicker
          ui:options:
            allowedKinds:
              - Group

  steps:
    - id: cloneGitlabRepo
      name: Clone Gitlab Repo
      action: gitlab:repo:clone
      input:
        remoteUrl: "https://<MY_GITLAB_ORGANIZATION>@gitlab.com/<MY_GITLAB_ORGANIZATION>/<MY_GITLAB_PROJECT>/_git/<MY_GITLAB_REPOSITORY>"
        branch: "main"
        targetPath: ./sub-directory

    - id: fetch
      name: Template Skeleton
      action: fetch:template
      input:
        url: ./skeleton
        targetPath: ./sub-directory
        values:
          name: ${{ parameters.name }}
          owner: ${{ parameters.owner }}

    - id: pushGitlabRepo
      name: Push to Remote Gitlab Repo
      action: gitlab:repo:push
      input:
        branch: <MY_GITLAB_REPOSITORY_BRANCH>
        sourcePath: ./sub-directory
        gitCommitMessage: Add ${{ parameters.name }} project files

    - id: pullRequestGitlabRepo
      name: Create a Pull Request to Gitlab Repo
      action: gitlab:repo:pr
      input:
        sourceBranch: <MY_GITLAB_REPOSITORY_BRANCH>
        targetBranch: "main"
        repoId: <MY_Gitlab_REPOSITORY>
        title: ${{ parameters.name }}
        project: <MY_Gitlab_PROJECT>
        supportsIterations: false

    - id: register
      name: Register
      action: catalog:register
      input:
        repoContentsUrl: "gitlab.com?owner=<MY_GITLAB_PROJECT>&repo=<MY_GITLAB_REPOSITORY>&organization=<MY_GITLAB_ORGANIZATION>&version=<MY_GITLAB_REPOSITORY_BRANCH>"
        catalogInfoPath: "/catalog-info.yaml"

  output:
    links:
      - title: Repository
        url: "gitlab.com?owner=<MY_GITLAB_PROJECT>&repo=<MY_GITLAB_REPOSITORY>&organization=<MY_GITLAB_ORGANIZATION>"
      - title: Open in catalog
        icon: catalog
        entityRef: ${{ steps.register.output.entityRef }}
```

Replace `<MY_GITLAB_ORGANIZATION>` with the name of your Gitlab DevOps
organization, `<MY_GITLAB_PROJECT>` with the name of your Gitlab DevOps project,
`<MY_GITLAB_REPOSITORY_BRANCH` with the name of the desired Gitlab DevOps repository branch,
and `<MY_GITLAB_REPOSITORY>` with the name of your Gitlab DevOps repository.

NOTE: You will not be able to register the Pull Request since the file will not exist from the main branch!

You can find a list of all registered actions including their parameters at the
`/create/actions` route in your Backstage application.
