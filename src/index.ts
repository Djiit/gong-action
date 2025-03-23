import { join } from "node:path";

import { debug, getInput, info, setFailed, warning } from "@actions/core";
import { getOctokit } from "@actions/github";
import { cacheFile, downloadTool, find, extractTar } from "@actions/tool-cache";
import { exec } from "@actions/exec";

import { getArch, isValidSemver, getPlatform, sanitizeVersion } from "./utils";

async function getGongVersion(version: string, token: string): Promise<string> {
  let actualVersion: string = "";
  if (version === "latest") {
    // Get latest release info from GitHub API
    const octokit = getOctokit(token);
    try {
      const { data: latestRelease } = await octokit.rest.repos.getLatestRelease(
        {
          owner: "Djiit",
          repo: "gong",
        }
      );
      actualVersion = sanitizeVersion(latestRelease.tag_name);
      info(`Latest version is ${actualVersion}`);
    } catch (error: any) {
      if (error.status === 404) {
        setFailed(
          "No releases found for Djiit/gong. Make sure the repository exists and has published releases."
        );
      } else {
        setFailed(`Failed to fetch latest release: ${error.message}`);
      }
    }
  } else {
    actualVersion = sanitizeVersion(version);
    if (!isValidSemver(actualVersion)) {
      setFailed(
        `Invalid version format: ${version}. Please use a valid semver format (x.y.z) or 'latest'.`
      );
    }
  }
  return actualVersion;
}

async function getGongPath(
  version: string,
  arch: string,
  platform: string
): Promise<string> {
  // Check if the tool is already cached
  let gongPath: string | undefined;

  gongPath = find("gong", version, arch);
  if (gongPath) {
    info(`gong ${version} found in cache`);
  } else {
    info(`gong ${version} not found in cache. Downloading...`);
    try {
      const downloadUrl = `https://github.com/Djiit/gong/releases/download/v${version}/gong_${version}_${platform}_amd64.tar.gz`;

      info(`Downloading gong from ${downloadUrl}`);

      const downloadPath = await downloadTool(downloadUrl);
      const extractedPath = await extractTar(downloadPath);

      await exec("chmod", ["+x", join(extractedPath, "gong")]);

      info("Downloaded gong successfully");

      gongPath = await cacheFile(
        join(extractedPath, "gong"),
        "gong",
        "gong",
        version,
        arch
      );
      info(`gong has been cached at ${gongPath}`);
    } catch (error: any) {
      if (error.message.includes("404")) {
        setFailed(
          `Version ${version} not found. Please check if this version exists in the Djiit/gong releases.`
        );
      } else {
        setFailed(`Failed to download gong: ${error.message}`);
      }
      return "";
    }
  }
  return gongPath;
}

async function run(): Promise<void> {
  try {
    const version: string = getInput("version");
    const args: string = getInput("args");
    const token: string = getInput("token");

    const platform: string = getPlatform();
    const arch: string = getArch();

    const gongVersion = await getGongVersion(version, token);
    const gongPath = await getGongPath(gongVersion, arch, platform);
    const gongExecutable = join(gongPath, "gong");

    let stdout = "";
    let stderr = "";

    info(`Running gong ${args}`);
    await exec(gongExecutable, args.split(" "), {
      listeners: {
        stdout: (data: Buffer) => {
          stdout += data.toString();
        },
        stderr: (data: Buffer) => {
          stderr += data.toString();
        },
      },
    });

    if (stdout) {
      info(stdout);
    }
    if (stderr) {
      warning(stderr);
    }
    debug("gong execution completed");
  } catch (error: any) {
    setFailed(error.message);
  }
}

run();
