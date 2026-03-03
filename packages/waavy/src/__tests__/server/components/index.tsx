import React from "react";

export const SimpleComponent = () => React.createElement("div", { id: "test" }, "Hello World");
export const ComponentWithProps = ({ name, age }: { name: string; age: number }) =>
  React.createElement("div", null, `Hello ${name}, age ${age}`);
export const NestedComponent = () =>
  React.createElement(
    "div",
    { className: "container" },
    React.createElement("h1", null, "Title"),
    React.createElement("p", null, "Content"),
    React.createElement(ComponentWithProps, { name: "Dunbar", age: 26 }),
  );
