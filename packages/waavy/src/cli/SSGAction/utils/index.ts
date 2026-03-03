import React from "react"
import path from "path";
import { writeStaticComponentToFile } from "@/server";
import {
  bundleInlineCode,
  getTempFileInNodeModulesCache,
  handleHydrationBundleOutput,
} from "@/server/hydration";
import type { PageConfiguration } from "@/types/cli/ssg";
import type WaavyReactPageRoute from "@/types/IWaavyReactPageRoute";
import Serializer from "@/utils/models/Serializer";
import useNonWaavyHydrationBundleTemplate from "@/templates/non-waavy-hydration-bundle";
import HydrationError from "@/errors/Hydration";

export async function handleStaticRoute<Props>(
  page: Omit<PageConfiguration<Props>, "route" | "routes">,
  route: WaavyReactPageRoute,
  out: string,
) {
  const { Component, filename, getStaticProps, options = {}, renderOptions } = page;
  const { hydration = { enabled: true, mount: { selector: "document" } } } = options;

  const skipBundling = !Boolean(hydration?.enabled);
  const outdir = out;

  try {
    let props;
    if (getStaticProps) {
      props = await Promise.try(getStaticProps, { params: (route.params as any) || {}, path: route.path });
    } else {
      props = {};
    }

    const serializable = Serializer.serializable(props);

    if (!serializable) {
      throw new Error("Props are not serializable");
    }

    const extension = path.extname(filename).slice(1) as "js" | "jsx" | "ts" | "tsx";
    const tempFile = await getTempFileInNodeModulesCache({ extension });
    const code = useNonWaavyHydrationBundleTemplate(tempFile, filename, props as any);
    const bundle = await bundleInlineCode(code, tempFile, outdir);
    handleHydrationBundleOutput(filename, bundle);

    writeStaticComponentToFile(React.createElement(Component as React.FunctionComponent<typeof props>, props as any), {
      filename,
      outdir,
      prerenderOptions: {

      }  
    })
  } catch (error) {
    if (error instanceof HydrationError) {
      console.error("[handleStaticRoute]: Hydration error occurred:", error);
      throw error;
    }
  }
}

export * from "./pages";
export * from "./waavy-react";
