import { cp, readFile, rm, writeFile } from 'fs/promises';
import path from 'path';
import { RELOG_FOLDER_NAME } from '../../constants/constants';
import {
  getPackageJSONWorkspaces,
  getPathToWorkspaces
} from '../../utils/workspaces';
import { createEntry } from '../create-entry';

const PATH_TO_TEST_DIRS = path.join(__dirname, 'test-dirs');

export async function prepareCreateEntryTest(isDoCleanup?: boolean) {
  const monorepoPath = path.join(PATH_TO_TEST_DIRS, 'create-entry/monorepo');
  const singleRepoPath = path.join(
    PATH_TO_TEST_DIRS,
    'create-entry/singlerepo'
  );

  const singleRepoMessage = 'test fresh single repo';
  const monorepoMessage = 'test fresh monorepo';

  // Clean up before tests.
  const monorepoPackageJSONWorkspaces = await getPackageJSONWorkspaces(
    path.join(monorepoPath)
  );
  const monorepoWorkspacePaths = await getPathToWorkspaces(
    monorepoPackageJSONWorkspaces!,
    monorepoPath
  );

  if (isDoCleanup) {
    const allFolders = [...monorepoWorkspacePaths, singleRepoPath];
    await Promise.all(
      allFolders.map((folder) =>
        rm(`${folder}/${RELOG_FOLDER_NAME}`, {
          force: true,
          recursive: true
        })
      )
    );
  }

  // Create changelog for each.
  const singleRepoFileNames = (
    await createEntry({
      message: singleRepoMessage,
      workspaces: [singleRepoPath]
    })
  ).map((name) => [name]);

  const monorepoFileNames = (
    await createEntry({
      message: monorepoMessage,
      workspaces: monorepoWorkspacePaths
    })
  ).map((name) => [name]);

  return {
    singleRepoFileNames,
    monorepoFileNames
  };
}

export async function prepareGenerateChangelogTest() {
  const emptyWorkspacesPath = await getFullWorkspacesPath(
    'generate-changelog/empty-monorepo'
  );
  const existWorkspacesPath = await getFullWorkspacesPath(
    'generate-changelog/exist-monorepo'
  );

  return {
    monorepo: {
      empty: emptyWorkspacesPath,
      exist: existWorkspacesPath
    },
    singleRepo: {
      empty: [
        path.join(PATH_TO_TEST_DIRS, 'generate-changelog/empty-singlerepo')
      ],
      exist: [
        path.join(PATH_TO_TEST_DIRS, 'generate-changelog/exist-singlerepo')
      ]
    }
  };
}

export async function resetTargetTestFolder(param: {
  targetFolder: string;
  version?: string;
  type: 'same-day' | 'different-day';
}) {
  return Promise.all([
    cp(
      path.join(PATH_TO_TEST_DIRS, `.samples/${param.type}`),
      `${param.targetFolder}/.relog`,
      {
        recursive: true
      }
    ),
    resetPackageJSONVersion(param.targetFolder, param.version),
    rm(path.join(param.targetFolder, 'CHANGELOG.md'), {
      force: true,
      recursive: true
    })
  ]);
}

export async function resetPackageJSONVersion(dir: string, version?: string) {
  const packageJSONPath = path.join(dir, `package.json`);
  const packageJSON = JSON.parse(await readFile(packageJSONPath, 'utf-8'));
  packageJSON.version = version || '0.0.0';

  return writeFile(
    packageJSONPath,
    JSON.stringify(packageJSON, null, 2) + '\n',
    'utf-8'
  );
}

// Helper functions.
async function getFullWorkspacesPath(dir: string) {
  const monorepoPath = path.join(PATH_TO_TEST_DIRS, dir);
  const workspaces = await getPackageJSONWorkspaces(monorepoPath);
  return getPathToWorkspaces(workspaces!, monorepoPath);
}
