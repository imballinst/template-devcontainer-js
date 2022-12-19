import { readFile, rm } from 'fs/promises';
import path from 'path';
import { afterAll, describe, expect, test } from 'vitest';
import { RELOG_FOLDER_NAME } from '../../constants/constants';
import { isPathExist } from '../../utils/fs';
import { generateChangelog } from '../generate-changelog';
import { copyEntries, prepareGenerateChangelogTest } from './test-utils';

describe('fresh', async () => {
  const { singleRepo, monorepo } = await prepareGenerateChangelogTest();

  test('single repo: should throw error when there are no files', async () => {
    const result = await generateChangelog(singleRepo.empty);
    expect(result.length).toBe(0);
  });

  test('monorepo: should throw error when there are no files', async () => {
    const result = await generateChangelog(monorepo.empty);
    expect(result.length).toBe(0);
  });
});

describe('existing', async () => {
  const { singleRepo, monorepo } = await prepareGenerateChangelogTest();
  // Clean up previous build result.
  await Promise.all([
    ...singleRepo.exist.map((targetFolder) =>
      rm(path.join(targetFolder, RELOG_FOLDER_NAME), {
        force: true,
        recursive: true
      })
    ),
    ...singleRepo.exist.map((targetFolder) =>
      rm(path.join(targetFolder, 'CHANGELOG.md'), {
        force: true,
        recursive: true
      })
    ),
    ...monorepo.exist.map((targetFolder) =>
      rm(path.join(targetFolder, RELOG_FOLDER_NAME), {
        force: true,
        recursive: true
      })
    ),
    ...monorepo.exist.map((targetFolder) =>
      rm(path.join(targetFolder, 'CHANGELOG.md'), {
        force: true,
        recursive: true
      })
    )
  ]);

  // Re-copy.
  await Promise.all([
    ...singleRepo.exist.map((targetFolder) =>
      copyEntries({ targetFolder, type: 'different-day' })
    ),
    ...monorepo.exist.map((targetFolder) =>
      copyEntries({ targetFolder, type: 'same-day' })
    )
  ]);

  // After the test, the `.relog` files will be "consumed".
  // Revert it back.
  afterAll(async () => {
    await Promise.all([
      ...singleRepo.exist.map((targetFolder) =>
        copyEntries({ targetFolder, type: 'different-day' })
      ),
      ...monorepo.exist.map((targetFolder) =>
        copyEntries({ targetFolder, type: 'same-day' })
      )
    ]);
  });

  test('single repo: should not throw error when there are entry changelog files', async () => {
    expect(() => generateChangelog(singleRepo.exist)).not.toThrow();
    const [pathToChangelog] = await generateChangelog(singleRepo.exist);
    const changelog = await readFile(pathToChangelog, 'utf-8');

    expect(changelog).toBe(
      `
## 0.0.1 - 2022-12-18

- test fresh single repo
- test fresh single repo the other day
    `.trim()
    );

    expect(
      await isPathExist(path.join(singleRepo.exist[0], RELOG_FOLDER_NAME))
    ).toBe(false);
  });

  describe('monorepo: should not throw error when there are entry changelog files', async () => {
    const pathToChangelogs = await generateChangelog(monorepo.exist);

    test.each(pathToChangelogs)('%s', async (pathToChangelog) => {
      const changelog = await readFile(pathToChangelog, 'utf-8');

      expect(changelog).toBe(
        `
## 0.0.1 - 2022-12-17

- test fresh monorepo
- test fresh monorepo
        `.trim()
      );

      expect(
        await isPathExist(
          path.join(path.dirname(pathToChangelog), RELOG_FOLDER_NAME)
        )
      ).toBe(false);
    });
  });
});
