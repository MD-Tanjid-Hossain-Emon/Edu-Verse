const fs = require('fs');
const os = require('os');
const path = require('path');

const videoDirectory =
  process.env.CCNA_VIDEO_DIR || path.join(os.homedir(), 'Downloads', 'CCNA');

function listCcnaVideos(directory = videoDirectory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    throw new Error(
      `CCNA video directory not found: ${directory}. Set CCNA_VIDEO_DIR to the folder containing the MP4 files.`
    );
  }

  const files = [];
  function collect(currentDirectory) {
    fs.readdirSync(currentDirectory, { withFileTypes: true }).forEach((entry) => {
      const fullPath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        collect(fullPath);
      } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.mp4') {
        const relativePath = path.relative(directory, fullPath).split(path.sep).join('/');
        const title = path
          .basename(entry.name, path.extname(entry.name))
          .replace(/^\s*\d+\s*[-_. ]\s*/, '')
          .replace(/_+/g, ' ')
          .trim();

        files.push({ relativePath, title: title || path.basename(entry.name) });
      }
    });
  }

  collect(directory);
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { numeric: true }));

  if (files.length === 0) {
    throw new Error(`No MP4 videos found in CCNA video directory: ${directory}`);
  }

  return files;
}

module.exports = { listCcnaVideos, videoDirectory };
