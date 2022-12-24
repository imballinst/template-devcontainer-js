import { readFile, rm, writeFile } from 'fs/promises';
import path from 'path';

import {
  MERGED_CHANGELOG_NAME,
  RELOG_FOLDER_NAME
} from '../constants/constants';
import { ChangelogContent } from '../types/changelog';
import { getCurrentUTCDate } from '../utils/date';
import { getDirectoryEntries, isPathExist } from '../utils/fs';
import { getNextPatchVersion } from '../utils/version';

export async function generateChangelog(
  packageFolders: string[]
): Promise<string[]> {
  const result = await Promise.all(
    packageFolders.map(async (packageFolder) => {
      const relogFolder = path.join(packageFolder, RELOG_FOLDER_NAME);
      const isFolderExist = await isPathExist(relogFolder);
      if (!isFolderExist) {
        return '';
      }

      const entries = await getDirectoryEntries(relogFolder);
      const entriesFiltered = entries.filter(
        (entry) => path.extname(entry.name) === '.json'
      );

      const allChangelogs: ChangelogContent[] = await Promise.all(
        entriesFiltered.map(async (entry) =>
          JSON.parse(
            await readFile(path.join(relogFolder, entry.name), 'utf-8')
          )
        )
      );
      allChangelogs.sort(
        (a, b) =>
          new Date(a.datetime).valueOf() - new Date(b.datetime).valueOf()
      );

      // Update changelog and package.json.
      const nextVersion = await updatePackageJSONVersion(packageFolder);

      const pathToChangelog = path.join(packageFolder, MERGED_CHANGELOG_NAME);
      await updateChangelog(pathToChangelog, nextVersion, allChangelogs);

      // Cleanup the folder after.
      await rm(relogFolder, { force: true, recursive: true });

      return pathToChangelog;
    })
  );

  return result.filter(Boolean);
}

// Helper functions.
async function updateChangelog(
  pathToChangelog: string,
  version: string,
  allChangelogs: ChangelogContent[]
): Promise<void> {
  const latestDate = new Date(allChangelogs[allChangelogs.length - 1].datetime);
  let existingContent = '';

  if (await isPathExist(pathToChangelog)) {
    const changelog = await readFile(pathToChangelog, 'utf-8');
    existingContent = `\n\n${changelog}`;
  }

  const changelogContent = `
## ${version} - ${getCurrentUTCDate(latestDate)}

${allChangelogs.map((log) => `- ${log.message}`).join('\n')}${existingContent}
  `.trim();

  await writeFile(pathToChangelog, changelogContent, 'utf-8');
}

async function updatePackageJSONVersion(
  packageFolder: string
): Promise<string> {
  const packageJSONString = await readFile(
    path.join(packageFolder, 'package.json'),
    'utf-8'
  );
  const packageJSON = JSON.parse(packageJSONString);
  const nextVersion = getNextPatchVersion(packageJSON.version);

  packageJSON.version = nextVersion;
  await writeFile(
    path.join(packageFolder, 'package.json'),
    JSON.stringify(packageJSON, null, 2),
    'utf-8'
  );
  return nextVersion;
}
