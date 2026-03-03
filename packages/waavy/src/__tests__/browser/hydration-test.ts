import React from "react";
import { hydrateRoot } from "react-dom/client";

const TestComponent = () => React.createElement("div", { id: "consistency-test" }, "Test Content");

hydrateRoot(document, React.createElement(TestComponent));
