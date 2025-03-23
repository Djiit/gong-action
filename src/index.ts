import { join } from "node:path";

import * as core from "@actions/core";
import { getOctokit } from "@actions/github";
import { cacheFile, downloadTool, find, extractTar } from "@actions/tool-cache";
import { exec } from "@actions/exec";

import { getArch, getPlatform } from "./utils";
import { isValidSemver, sanitizeVersion } from "./version";
import { listeners } from "node:process";

async function run(): Promise<void> {
  try {
    const version: string = core.getInput("version");
    const args: string = core.getInput("args");
    const token: string = core.getInput("token");

    const platform: string = getPlatform();
    const arch: string = getArch();

    let gongPath: string;
    let actualVersion: string = version;

    if (version === "latest") {
      // Get latest release info from GitHub API
      const octokit = getOctokit(token);
      try {
        const { data: latestRelease } =
          await octokit.rest.repos.getLatestRelease({
            owner: "Djiit",
            repo: "gong",
          });
        actualVersion = sanitizeVersion(latestRelease.tag_name);
        core.info(`Latest version is ${actualVersion}`);
      } catch (error: any) {
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
    gongPath = find("gong", actualVersion, arch);

    if (gongPath) {
      core.info(`gong ${actualVersion} found in cache`);
    } else {
      core.info(`gong ${actualVersion} not found in cache. Downloading...`);
      try {
        const downloadUrl = `https://github.com/Djiit/gong/releases/download/v${actualVersion}/gong_${actualVersion}_${platform}_amd64.tar.gz`;

        core.info(`Downloading gong from ${downloadUrl}`);

        const downloadPath = await downloadTool(downloadUrl);
        const extractedPath = await extractTar(downloadPath);

        await exec("chmod", ["+x", join(extractedPath, "gong")]);

        core.info("Downloaded gong successfully");

        gongPath = await cacheFile(
          join(extractedPath, "gong"),
          "gong",
          "gong",
          actualVersion,
          arch
        );
        core.info(`gong has been cached at ${gongPath}`);
      } catch (error: any) {
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

    const gongExecutable = join(gongPath, "gong");

    let stdout = "";
    let stderr = "";

    core.info(`Running gong ${args}`);
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
      core.info(stdout);
    }
    if (stderr) {
      core.warning(stderr);
    }
    core.debug("gong execution completed");
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
