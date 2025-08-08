const BackfillService = require('./backfill-service');
const fs = require('fs').promises;
const path = require('path');

describe('BackfillService Cache Cleanup', () => {
  let backfillService;
  let testDataDir;
  
  beforeEach(() => {
    backfillService = new BackfillService();
    testDataDir = 'data';
  });

  afterEach(async () => {
    // Clean up any test files
    try {
      const files = await fs.readdir(testDataDir);
      const testFiles = files.filter(file => 
        file.startsWith('test-') && file.endsWith('.json')
      );
      
      for (const file of testFiles) {
        await fs.unlink(path.join(testDataDir, file));
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('cleanupOutdatedCacheFiles', () => {
    test('should identify and remove problematic files', async () => {
      // Create a test problematic file
      const testFile = 'test-problematic.json';
      const testFilePath = path.join(testDataDir, testFile);
      await fs.writeFile(testFilePath, JSON.stringify({ test: 'data' }));

      const result = await backfillService.cleanupOutdatedCacheFiles({
        maxAgeDays: 30,
        problematicFiles: [testFile]
      });

      expect(result.success).toBe(true);
      expect(result.filesIdentifiedForRemoval).toBe(1);
      expect(result.filesSuccessfullyRemoved).toBe(1);
      expect(result.removedFiles[0].filename).toBe(testFile);
      expect(result.removedFiles[0].reason).toContain('problematic_file');
      expect(result.backupCreated).toBe(true);

      // Verify file was actually removed
      const fileExists = await fs.access(testFilePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(false);
    });

    test('should identify and remove old files based on age', async () => {
      // Create a test file
      const testFile = 'test-old.json';
      const testFilePath = path.join(testDataDir, testFile);
      await fs.writeFile(testFilePath, JSON.stringify({ test: 'old data' }));

      // Set file to be old (35 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);
      const fd = await fs.open(testFilePath, 'r+');
      await fd.utimes(oldDate, oldDate);
      await fd.close();

      const result = await backfillService.cleanupOutdatedCacheFiles({
        maxAgeDays: 30,
        problematicFiles: []
      });

      expect(result.success).toBe(true);
      expect(result.filesIdentifiedForRemoval).toBe(1);
      expect(result.filesSuccessfullyRemoved).toBe(1);
      expect(result.removedFiles[0].filename).toBe(testFile);
      expect(result.removedFiles[0].reason).toContain('file_too_old');
      expect(result.removedFiles[0].age).toBeGreaterThan(30);

      // Verify file was actually removed
      const fileExists = await fs.access(testFilePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(false);
    });

    test('should not remove recent files', async () => {
      // Create a recent test file
      const testFile = 'test-recent.json';
      const testFilePath = path.join(testDataDir, testFile);
      await fs.writeFile(testFilePath, JSON.stringify({ test: 'recent data' }));

      const result = await backfillService.cleanupOutdatedCacheFiles({
        maxAgeDays: 30,
        problematicFiles: []
      });

      expect(result.success).toBe(true);
      expect(result.filesIdentifiedForRemoval).toBe(0);
      expect(result.filesSuccessfullyRemoved).toBe(0);
      expect(result.backupCreated).toBe(false);

      // Verify file still exists
      const fileExists = await fs.access(testFilePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Clean up
      await fs.unlink(testFilePath);
    });

    test('should handle empty data directory gracefully', async () => {
      const result = await backfillService.cleanupOutdatedCacheFiles();

      expect(result.success).toBe(true);
      expect(result.totalFilesEvaluated).toBe(0);
      expect(result.filesIdentifiedForRemoval).toBe(0);
      expect(result.filesSuccessfullyRemoved).toBe(0);
      expect(result.backupCreated).toBe(false);
    });

    test('should create backup before removing files', async () => {
      // Create a test file to be removed
      const testFile = 'test-backup.json';
      const testFilePath = path.join(testDataDir, testFile);
      const testData = { test: 'backup data', timestamp: Date.now() };
      await fs.writeFile(testFilePath, JSON.stringify(testData));

      const result = await backfillService.cleanupOutdatedCacheFiles({
        maxAgeDays: 30,
        problematicFiles: [testFile]
      });

      expect(result.success).toBe(true);
      expect(result.backupCreated).toBe(true);
      expect(result.backupPath).toBeTruthy();

      // Verify backup exists and contains correct data
      const backupFilePath = path.join(result.backupPath, testFile);
      const backupExists = await fs.access(backupFilePath).then(() => true).catch(() => false);
      expect(backupExists).toBe(true);

      const backupData = JSON.parse(await fs.readFile(backupFilePath, 'utf8'));
      expect(backupData).toEqual(testData);

      // Verify manifest exists
      const manifestPath = path.join(result.backupPath, 'backup-manifest.json');
      const manifestExists = await fs.access(manifestPath).then(() => true).catch(() => false);
      expect(manifestExists).toBe(true);

      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      expect(manifest.backupReason).toBe('cache_cleanup');
      expect(manifest.totalFiles).toBe(1);
      expect(manifest.successfulBackups).toBe(1);
    });
  });

  describe('createCacheBackup', () => {
    test('should create backup with manifest', async () => {
      // Create test files
      const testFiles = [
        { filename: 'test-backup1.json', path: path.join(testDataDir, 'test-backup1.json') },
        { filename: 'test-backup2.json', path: path.join(testDataDir, 'test-backup2.json') }
      ];

      for (const file of testFiles) {
        await fs.writeFile(file.path, JSON.stringify({ test: file.filename }));
      }

      const result = await backfillService.createCacheBackup(testFiles);

      expect(result.success).toBe(true);
      expect(result.totalFiles).toBe(2);
      expect(result.successfulBackups).toBe(2);
      expect(result.failedBackups).toBe(0);
      expect(result.backupPath).toBeTruthy();

      // Verify backup files exist
      for (const file of testFiles) {
        const backupFilePath = path.join(result.backupPath, file.filename);
        const backupExists = await fs.access(backupFilePath).then(() => true).catch(() => false);
        expect(backupExists).toBe(true);
      }

      // Clean up test files
      for (const file of testFiles) {
        await fs.unlink(file.path);
      }
    });
  });

  describe('isProblematicFile', () => {
    test('should identify known problematic files', () => {
      expect(backfillService.isProblematicFile('2025-08.json')).toBe(true);
      expect(backfillService.isProblematicFile('2025-09.json')).toBe(false);
      expect(backfillService.isProblematicFile('normal-file.json')).toBe(false);
    });
  });
});