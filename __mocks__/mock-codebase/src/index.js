/**
 * Main entry point for the application
 * This is a simple demonstration file for testing the code summarizer
 */

const { formatDate } = require('./utils/helpers');

/**
 * Main function that demonstrates date formatting
 */
function main() {
  const currentDate = new Date();
  const formattedDate = formatDate(currentDate);
  
  console.log(`Current date: ${formattedDate}`);
  console.log('Hello, world!');
  
  return formattedDate;
}

// Run the main function when this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { main };
