import PackageConfiguration from "@pkg/config";

export type FeatureFlag = keyof typeof PackageConfiguration.features;

class Features {
  public isEnabled(flag: FeatureFlag): boolean {
    return PackageConfiguration.features[flag];
  }
}

export default new Features();
