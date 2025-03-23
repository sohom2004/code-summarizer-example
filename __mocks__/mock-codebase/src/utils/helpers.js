/**
 * Utility functions for date formatting and other common operations
 */

/**
 * Format a date into ISO string format
 * @param {Date} date - The date to format
 * @returns {string} The formatted date string
 */
function formatDate(date) {
  return date.toISOString();
}

/**
 * Capitalize the first letter of a string
 * @param {string} text - The input string
 * @returns {string} The string with first letter capitalized
 */
function capitalize(text) {
  if (!text || typeof text !== 'string' || text.length === 0) {
    return '';
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

module.exports = {
  formatDate,
  capitalize
};
