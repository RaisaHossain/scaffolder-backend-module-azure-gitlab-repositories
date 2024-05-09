import { Git } from "@backstage/backend-common";
import { Logger } from "winston";
import {GitlabCredentialsProvider} from "@backstage/integration";
import {CreateProjectOptions, Gitlab} from "@gitbeaker/core";

export async function cloneRepo({
  dir,
  auth,
  logger,
  remote = "origin",
  remoteUrl,
  branch = "main",
}: {
  dir: string;
  auth: { username: string; password: string } | { token: string };
  logger: Logger;
  remote?: string;
  remoteUrl: string;
  branch?: string;
}): Promise<void> {
  const git = Git.fromAuth({
    ...auth,
    logger,
  });

  await git.clone({
    url: remoteUrl,
    dir,
  });

  await git.addRemote({
    dir,
    remote,
    url: remoteUrl,
  });

  await git.checkout({
    dir,
    ref: branch,
  });
}

export async function commitAndPushBranch({
  dir,
  logger,
  remote = 'origin',
  commitMessage,
  gitAuthorInfo,
  branch = 'scaffolder',
}: {
  dir: string;
  credentialsProvider: GitlabCredentialsProvider;
  logger: Logger;
  remote?: string;
  commitMessage: string;
  gitAuthorInfo?: { name?: string; email?: string };
  branch?: string;
}): Promise<void> {
  const authorInfo = {
    name: gitAuthorInfo?.name ?? "Scaffolder",
    email: gitAuthorInfo?.email ?? "scaffolder@backstage.io",
  };

  const git = Git.fromAuth({
    logger,
  });

  await git.add({
    dir,
    filepath: ".",
  });

  await git.commit({
    dir,
    message: commitMessage,
    author: authorInfo,
    committer: authorInfo,
  });

  await git.push({
    dir,
    remote: remote,
    remoteRef: `refs/heads/${branch}`,
  });
}

export async function createGitLabMergeRequest({
  gitlab,projectId,sourceBranch,targetBranch,title,description,
}:{
  gitlab: Gitlab;
  projectId: string | number;
  sourceBranch: string;
  targetBranch: string;
  title: string;
  description?: string;
}): Promise<any> {
  const mergeRequest = {
    sourceBranch,
    targetBranch,
    title,
    description,
  };
  const mr = await gitlab.MergeRequests.create(projectId, mergeRequest);
  return mr.data;
}

export async function updateGitLabMergeRequest({
    gitlab, projectId, mergeRequestId, title, description,
}:{
  gitlab: Gitlab;
  projectId: string | number;
  mergeRequestId: number;
  title?: string;
  description?: string;
}): Promise<void> {
  const updateOptions = {
    id: projectId,
    merge_request_id: mergeRequestId,
    title: title,
    description: description,
  };

  await gitlab.MergeRequests.edit(projectId, mergeRequestId, updateOptions);
}

export async function createGitLabProject(
    gitlab: Gitlab,
    projectName: string,
    options?: CreateProjectOptions
): Promise<any>{
  try {
    const project = await gitlab.Projects.create({
      name: projectName,
      ...options,
    });
    return project.data;
  } catch (error) {
    console.error("Error creating GitLab project:", error);
    return undefined;
  }
}

export async function getGitLabRepository(
    gitlab: Gitlab,
    projectId: string | number
): Promise<any> {
  try{
    const repository = await gitlab.Projects.show(projectId);
    return repository.data;
  } catch (error) {
    console.error("Error fetching repository:", error);
    throw error;
  }


}

export async function createGitLabBranch(
    gitlab: Gitlab,
    projectId: string | number,
    branchName: string,
    ref: string
): Promise<any> {
  const branch = await gitlab.Branches.create(projectId, branchName, ref);
  return branch.data;
}