import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Save uploaded files to the server and return their paths
 * @param files The uploaded files from multer
 * @returns An array of file paths relative to the public directory
 */
export const saveUploadedFiles = (
  files: Express.Multer.File[],
  directory: string = 'uploads'
): string[] => {
  const savedPaths: string[] = [];

  if (!files || files.length === 0) {
    return savedPaths;
  }

  // Ensure upload directory exists
  const uploadDir = path.join(process.cwd(), 'public', directory);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  files.forEach(file => {
    // Generate a unique filename to prevent collisions
    const uniqueFilename = `${uuidv4()}-${file.originalname}`;
    const filePath = path.join(uploadDir, uniqueFilename);

    // Write the file
    fs.writeFileSync(filePath, file.buffer);

    // Save the path relative to public directory for the database
    savedPaths.push(`/${directory}/${uniqueFilename}`);
  });

  return savedPaths;
};

/**
 * Delete file from server when no longer needed
 * @param filePath The path to the file relative to public directory
 * @returns boolean indicating success or failure
 */
export const deleteUploadedFile = (filePath: string): boolean => {
  try {
    // Get absolute path from relative path (remove leading slash)
    const absolutePath = path.join(
      process.cwd(),
      'public',
      filePath.startsWith('/') ? filePath.substring(1) : filePath
    );

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};
