// Set up necessary folders for file uploads
import fs from 'fs';
import path from 'path';
import logger from './logger';

/**
 * Creates all necessary upload directories for the application
 */
const createUploadsDirectory = (): void => {
  const directories = [
    path.join(__dirname, '../../public/uploads'),
    path.join(__dirname, '../../public/uploads/stream'),
    path.join(__dirname, '../../public/uploads/profiles'),
    path.join(__dirname, '../../public/uploads/assignments'),
    path.join(__dirname, '../../logs')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      } catch (error) {
        logger.error(`Failed to create directory: ${dir}`, error);
      }
    }
  });
};

/**
 * Validates if a file exists at the given path
 * @param filePath Path to the file
 * @returns Boolean indicating if file exists
 */
const fileExists = (filePath: string): boolean => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    logger.error(`Error checking if file exists: ${filePath}`, error);
    return false;
  }
};

/**
 * Safely deletes a file if it exists
 * @param filePath Path to the file to delete
 * @returns Boolean indicating if deletion was successful
 */
const safeDeleteFile = (filePath: string): boolean => {
  try {
    if (fileExists(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Successfully deleted file: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Failed to delete file: ${filePath}`, error);
    return false;
  }
};

export {
  createUploadsDirectory,
  fileExists,
  safeDeleteFile
};
