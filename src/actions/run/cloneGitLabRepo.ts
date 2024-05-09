import { resolveSafeChildPath } from "@backstage/backend-common";
import { InputError } from "@backstage/errors";
import { DefaultGitlabCredentialsProvider, ScmIntegrationRegistry } from "@backstage/integration";
import { createTemplateAction } from "@backstage/plugin-scaffolder-backend";

import { cloneRepo } from "../helpers";

/**
 * Creates a 'gitlab:repo:clone' Scaffolder action.
 *
 * @remarks
 *
 *This Scaffolder action will clone a GitLab repository into the workspace directory.
 *
 * @public
 * @param options
 */
export const cloneGitLabRepoAction = (options: {
  integrations: ScmIntegrationRegistry;
}) => {
  const { integrations } = options;

  return createTemplateAction<{
    remoteUrl: string;
    branch?: string;
    targetPath?: string;
    server: string;
    token?: string;
  }>({
    id: "gitlab:repo:clone",
    description: "Clone a Gitlab repository into the workspace directory.",
    schema: {
      input: {
        required: ["remoteUrl"],
        type: "object",
        properties: {
          remoteUrl: {
            title: "Remote URL",
            type: "string",
            description: "The Git URL to the repository.",
          },
          branch: {
            title: "Repository Branch",
            type: "string",
            description: "The branch to checkout to.",
          },
          targetPath: {
            title: "Working Subdirectory",
            type: "string",
            description:
              "The subdirectory of the working directory to clone the repository into.",
          },
          server: {
            type: "string",
            title: "Server hostname",
            description: "The hostname of the Gitlab service.",
          },
          token: {
            title: "Authentication Token",
            type: "string",
            description: "The token to use for authorization.",
          },
        },
      },
    },
    async handler(ctx) {
      const { remoteUrl, branch } = ctx.input;

      const targetPath = ctx.input.targetPath ?? "./";
      const outputDir = resolveSafeChildPath(ctx.workspacePath, targetPath);

      const provider = DefaultGitlabCredentialsProvider.fromIntegrations(integrations);
      const credentials = await provider.getCredentials({ url: remoteUrl });

      let auth: { token: string };

      if (ctx.input.token) {
        auth = { token: ctx.input.token };
      } else if (credentials?.token) {
        auth = { token: credentials.token };
      } else {
        throw new InputError(
            `No token credentials provided for GitLab repository ${remoteUrl}`,
        );
      }

      await cloneRepo({
        dir: outputDir,
        auth: auth,
        logger: ctx.logger,
        remoteUrl: remoteUrl,
        branch: branch,
      });
    },
  });
};
