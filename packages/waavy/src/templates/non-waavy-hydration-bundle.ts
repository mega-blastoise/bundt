import path from "path";
import type { SerializableObject } from "@/types";

export default (
  tmpFilePath: string,
  componentFilePath: string,
  props: SerializableObject = {},
  selector: string = "document",
) => `
import React from "react";
import * as ReactDOMClient from "react-dom/client";
import Page from "${path.relative(tmpFilePath, componentFilePath)}";

ReactDOMClient.hydrateRoot(
    document.querySelector("${selector}"),
    React.createElement(Page, ${JSON.stringify(props)})
);
`;
