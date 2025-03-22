const core = require('@actions/core');
const github = require('@actions/github');
const tc = require('@actions/tool-cache');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

async function run() {
  try {
    // Get inputs from action
    const version = core.getInput('version');
    const args = core.getInput('args');
    
    // Determine the platform and architecture
    const platform = getPlatform();
    const arch = getArch();
    
    let gongPath;
    let actualVersion = version;
    
    if (version === 'latest') {
      // Get latest release info from GitHub API
      const octokit = github.getOctokit(process.env.GITHUB_TOKEN || '');
      const { data: latestRelease } = await octokit.rest.repos.getLatestRelease({
        owner: 'Djiit',
        repo: 'gong'
      });
      
      actualVersion = latestRelease.tag_name.replace(/^v/, '');
      core.info(`Latest version is ${actualVersion}`);
    }
    
    // Check if the tool is already cached
    gongPath = tc.find('gong', actualVersion, arch);
    
    if (gongPath) {
      core.info(`gong ${actualVersion} found in cache`);
    } else {
      core.info(`gong ${actualVersion} not found in cache. Downloading...`);
      
      // Determine the URL to download gong
      let downloadUrl;
      
      if (version === 'latest') {
        // Find the appropriate asset for the current platform and architecture
        const assetPattern = new RegExp(`gong_.*_${platform}_${arch}`);
        const asset = latestRelease.assets.find(asset => assetPattern.test(asset.name));
        
        if (!asset) {
          throw new Error(`No release found for ${platform}_${arch} in latest version`);
        }
        
        downloadUrl = asset.browser_download_url;
      } else {
        // Construct URL for specific version
        const fileName = `gong_${version}_${platform}_${arch}`;
        downloadUrl = `https://github.com/Djiit/gong/releases/download/v${version}/${fileName}`;
      }
      
      core.info(`Downloading gong from ${downloadUrl}`);
      
      // Download the gong binary
      const downloadPath = await tc.downloadTool(downloadUrl);
      
      // Make the binary executable
      await execPromise(`chmod +x ${downloadPath}`);
      
      core.info('Downloaded gong successfully');
      
      // Cache the tool for future use
      gongPath = await tc.cacheFile(downloadPath, 'gong', 'gong', actualVersion, arch);
      core.info(`gong has been cached at ${gongPath}`);
    }
    
    const gongExecutable = path.join(gongPath, 'gong');
    // so this is a change
    // Run gong with provided arguments
    core.info(`Running gong ${args}`);
    const { stdout, stderr } = await execPromise(`${gongExecutable} ${args}`);
    
    if (stdout) {
      core.info(stdout);
    }
    
    if (stderr) {
      core.warning(stderr);
    }
    
    core.info('gong execution completed');
  } catch (error) {
    core.setFailed(error.message);
  }
}

function getPlatform() {
  const platform = os.platform();
  
  switch (platform) {
    case 'darwin':
      return 'darwin';
    case 'linux':
      return 'linux';
    case 'win32':
      return 'windows';
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

function getArch() {
  const arch = os.arch();
  
  switch (arch) {
    case 'x64':
      return 'amd64';
    case 'arm64':
      return 'arm64';
    case 'ia32':
      return '386';
    default:
      throw new Error(`Unsupported architecture: ${arch}`);
  }
}

run();