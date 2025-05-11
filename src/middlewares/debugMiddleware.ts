// src/middlewares/debugMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

/**
 * Debug middleware to help identify file upload issues
 * Only active in development environment
 */
export const debugFileUploads = (req: Request, res: Response, next: NextFunction): void => {
    // Only run in development
    if (process.env.NODE_ENV === 'production') {
        return next();
    }

    if (req.files) {
        logger.debug('Request contains files', {
            count: Array.isArray(req.files) ? req.files.length : Object.keys(req.files).length,
            files: req.files
        });

        // Check if the upload directories exist
        const uploadDirs = [
            path.join(__dirname, '../../public/uploads'),
            path.join(__dirname, '../../public/uploads/stream'),
            path.join(__dirname, '../../public/uploads/profiles'),
            path.join(__dirname, '../../public/uploads/assignments')
        ];

        uploadDirs.forEach(dir => {
            const exists = fs.existsSync(dir);
            logger.debug(`Directory check: ${dir}`, { exists });

            if (!exists) {
                try {
                    fs.mkdirSync(dir, { recursive: true });
                    logger.info(`Created missing directory: ${dir}`);
                } catch (err) {
                    logger.error(`Failed to create directory: ${dir}`, err);
                }
            } else {
                // Check if directory is writable
                try {
                    const testFile = path.join(dir, '.test_write_permission');
                    fs.writeFileSync(testFile, 'test');
                    fs.unlinkSync(testFile);
                    logger.debug(`Directory ${dir} is writable`);
                } catch (err) {
                    logger.error(`Directory ${dir} is not writable`, err);
                }
            }
        });
    }

    next();
};

/**
 * Debug middleware to inspect request objects
 */
export const debugRequests = (req: Request, res: Response, next: NextFunction): void => {
    // Only run in development
    if (process.env.NODE_ENV === 'production') {
        return next();
    }

    logger.debug('Request details', {
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
        body: req.body,
        headers: req.headers,
        files: req.files,
    });

    // Track response
    const originalSend = res.send;
    res.send = function(body) {
        logger.debug('Response sent', {
            statusCode: res.statusCode,
            contentType: res.getHeader('content-type'),
            bodyPreview: typeof body === 'string' ? body.substring(0, 100) + '...' : 'Non-string body'
        });
        return originalSend.call(this, body);
    };

    next();
};
