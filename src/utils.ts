import { arch, platform } from "os";

export function getPlatform(): string {
  const currentPlatform = platform();
  switch (currentPlatform) {
    case "darwin":
      return "darwin";
    case "linux":
      return "linux";
    case "win32":
      return "windows";
    default:
      throw new Error(`Unsupported platform: ${currentPlatform}`);
  }
}

export function getArch(): string {
  const currentArch = arch();
  switch (currentArch) {
    case "x64":
      return "amd64";
    case "arm64":
      return "arm64";
    case "ia32":
      return "386";
    default:
      throw new Error(`Unsupported architecture: ${currentArch}`);
  }
}

export function isValidSemver(version: string): boolean {
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
  return semverRegex.test(version);
}

export function sanitizeVersion(version: string): string {
  return version.replace(/^v/, "");
}
