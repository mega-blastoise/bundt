// @no-test
import pkg from "@pkg/metadata";

export function getVersion() {
  return getPackageMetadata("version");
}

export function getPackageMetadata(field?: keyof typeof pkg) {
  if (!field) {
    return pkg;
  }

  if (field in pkg) {
    return pkg[field];
  }

  return null;
}
