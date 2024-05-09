import {DefaultGitlabCredentialsProvider, ScmIntegrationRegistry} from "@backstage/integration";
import { createTemplateAction } from "@backstage/plugin-scaffolder-backend";
import {InputError} from "@backstage/errors";
import { createGitLabMergeRequest, updateGitLabMergeRequest} from "../helpers";
import { Gitlab } from "@gitbeaker/core";

/**
 * Creates a`gitlab:repo:pr` Scaffolder action.
 *
 * @remarks
 *
 * This Scaffolder action will create a merge request to a repository in GitLab.
 *
 * @public
 */
export const pullRequestGitLabRepoAction = (options: {
  integrations: ScmIntegrationRegistry;
}) => {
  const { integrations } = options;

  return createTemplateAction<{
    organization?: string;
    sourceBranch?: string;
    targetBranch?: string;
    title: string;
    description?: string;
    repoId: string;
    project?: string;
    supportsIterations?: boolean;
    server: string;
    token?: string;
    autoComplete?: boolean;
  }>({
    id: 'gitlab:repo:pr',
    description: 'Create a merge request to a repository in Gitlab.',
    schema: {
      input: {
        type: 'object',
        required: ['repoId', 'title'],
        properties: {
          organization: {
            title: 'Organization Name',
            type: 'string',
            description: 'The name of the organization in Gitlab.',
          },
          sourceBranch: {
            title: 'Source Branch',
            type: 'string',
            description: 'The branch to merge into the source.',
          },
          targetBranch: {
            title: 'Target Branch',
            type: 'string',
            description: "The branch to merge into (default: main).",
          },
          title: {
            title: 'Title',
            description: 'The title of the merge request.',
            type: 'string',
          },
          description: {
            title: 'Description',
            description: 'The description of the merge request.',
            type: 'string'
          },
          repoId: {
            title: 'Remote Repo ID',
            description: 'Repo ID of the merge request.',
            type: 'string',
          },
          project: {
            title: 'Project',
            description: 'The Project in Gitlab.',
            type: 'string',
          },
          supportsIterations: {
            title: 'Supports Iterations',
            description: 'Whether or not the MR supports iterations.',
            type: 'boolean',
          },
          server: {
            type: "string",
            title: "Server hostname",
            description: "The hostname of the Gitlab service. Defaults to gitlab.com",
          },
          token: {
            title: 'Authentication Token',
            type: 'string',
            description: 'The token to use for authorization.',
          },
          autoComplete: {
            title: 'Enable auto-completion',
            description: 'Enable auto-completion of the merge request once policies are met',
            type: 'boolean'
          }
        }
      },
      output: {
        type: 'number',
        properties: {
          pullRequestId: {
            title: 'The ID of the created merge request',
            type: 'number'
          }
        }
      }
    },
    async handler(ctx) {
      const { title, server, project} = ctx.input;

      const sourceBranch = `refs/heads/${ctx.input.sourceBranch}` ?? `refs/heads/scaffolder`;
      const targetBranch = `refs/heads/${ctx.input.targetBranch}` ?? `refs/heads/main`;

      const host = server ?? "gitlab.com";
      const provider = DefaultGitlabCredentialsProvider.fromIntegrations(integrations);
      const url = `https://${host}/${ctx.input.organization}`;
      const credentials = await provider.getCredentials({ url: url });

      const token = ctx.input.token ?? credentials?.token;

      const description = ctx.input.description ?? "";
      const autoComplete = ctx.input.autoComplete ?? false;

      if (!token) {
        throw new InputError(`No token credentials provided for ${url}`);
      }

      const gitlab = new Gitlab({
        host,
        token,
      });

      const mergeRequest = {
        source_branch: sourceBranch,
        target_branch: targetBranch,
        title: title,
        description: description
      };

      const mergeRequestResponse = await createGitLabMergeRequest({
        gitlab,
        projectId: project!,
        sourceBranch: sourceBranch,
        targetBranch: targetBranch,
        title: title,
        description: description,
      });

      // this can't be set at creation time, so we have to update the MR to set it
      if (autoComplete) {
        await updateGitLabMergeRequest({
          gitlab,
          projectId: project!,
          mergeRequestId: mergeRequestResponse.iid,
          ...mergeRequest,
        });
      }
      ctx.output("mergeRequestId", mergeRequestResponse.iid);
    },
  });
};
