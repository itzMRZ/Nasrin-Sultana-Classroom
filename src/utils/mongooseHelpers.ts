/**
 * TypeScript helper utilities for working with Mongoose documents
 */

/**
 * Safely access document ID as string
 * @param obj Any document object that might have an _id
 * @returns String ID or undefined
 */
export const getDocumentId = (obj: any): string | undefined => {
  if (obj && obj._id) {
    return obj._id.toString();
  }
  return undefined;
};

/**
 * Type assertion for checking if a value is in an array
 * @param array The array to check
 * @param value The value to search for
 * @returns True if value is in array
 */
export const arrayIncludes = <T>(array: any[] | undefined, value: T): boolean => {
  if (!array) return false;
  return array.some((item: any) => {
    if (typeof value === 'string' && typeof item?._id === 'object') {
      return item._id.toString() === value;
    }
    return item === value;
  });
};

/**
 * Safely convert an object ID to string
 * @param id The ID to convert
 * @returns String representation of ID
 */
export const objectIdToString = (id: any): string => {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (id.toString) return id.toString();
  return '';
};
