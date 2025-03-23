const core = require("@actions/core");
const github = require("@actions/github");
const tc = require("@actions/tool-cache");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const { promisify } = require("util");

const execPromise = promisify(exec);

// Validation de format semver simple (x.y.z)
function isValidSemver(version) {
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
  return semverRegex.test(version);
}

function sanitizeVersion(version) {
  return version.replace(/^v/, "");
}

async function run() {
  try {
    // Get inputs from action
    const version = core.getInput("version");
    const args = core.getInput("args");
    const token = core.getInput("token");

    // Determine the platform and architecture
    const platform = getPlatform();
    const arch = getArch();

    let gongPath;
    let actualVersion = version;

    if (version === "latest") {
      // Get latest release info from GitHub API
      const octokit = github.getOctokit(token);

      try {
        const { data: latestRelease } =
          await octokit.rest.repos.getLatestRelease({
            owner: "Djiit",
            repo: "gong",
          });

        actualVersion = latestRelease.tag_name.replace(/^v/, "");
        core.info(`Latest version is ${actualVersion}`);
      } catch (error) {
        if (error.status === 404) {
          core.setFailed(
            "No releases found for Djiit/gong. Make sure the repository exists and has published releases."
          );
        } else {
          core.setFailed(`Failed to fetch latest release: ${error.message}`);
        }
        return;
      }
    } else {
      actualVersion = sanitizeVersion(version);

      if (!isValidSemver(actualVersion)) {
        core.setFailed(
          `Invalid version format: ${version}. Please use a valid semver format (x.y.z) or 'latest'.`
        );
        return;
      }
    }

    // Check if the tool is already cached
    gongPath = tc.find("gong", actualVersion, arch);

    if (gongPath) {
      core.info(`gong ${actualVersion} found in cache`);
    } else {
      core.info(`gong ${actualVersion} not found in cache. Downloading...`);

      try {
        // Determine the URL to download gong
        const downloadUrl = `https://github.com/Djiit/gong/releases/download/v${actualVersion}/gong_${actualVersion}_${platform}_amd64.tar.gz`;
        core.info(`Downloading gong from ${downloadUrl}`);

        // Download the gong binary
        const downloadPath = await tc.downloadTool(downloadUrl);
        const extractedPath = await tc.extractTar(downloadPath);

        // Make the binary executable
        await execPromise(`chmod +x ${path.join(extractedPath, "gong")}`);

        core.info("Downloaded gong successfully");

        // Cache the tool for future use
        gongPath = await tc.cacheFile(
          path.join(extractedPath, "gong"),
          "gong",
          "gong",
          actualVersion,
          arch
        );
        core.info(`gong has been cached at ${gongPath}`);
      } catch (error) {
        if (error.message.includes("404")) {
          core.setFailed(
            `Version ${actualVersion} not found. Please check if this version exists in the Djiit/gong releases.`
          );
        } else {
          core.setFailed(`Failed to download gong: ${error.message}`);
        }
        return;
      }
    }

    const gongExecutable = path.join(gongPath, "gong");
    // Run gong with provided arguments
    core.info(`Running gong ${args}`);
    const { stdout, stderr } = await execPromise(`${gongExecutable} ${args}`);

    if (stdout) {
      core.info(stdout);
    }

    if (stderr) {
      core.warning(stderr);
    }

    core.info("gong execution completed");
  } catch (error) {
    core.setFailed(error.message);
  }
}

function getPlatform() {
  const platform = os.platform();

  switch (platform) {
    case "darwin":
      return "darwin";
    case "linux":
      return "linux";
    case "win32":
      return "windows";
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

function getArch() {
  const arch = os.arch();

  switch (arch) {
    case "x64":
      return "amd64";
    case "arm64":
      return "arm64";
    case "ia32":
      return "386";
    default:
      throw new Error(`Unsupported architecture: ${arch}`);
  }
}

run();
