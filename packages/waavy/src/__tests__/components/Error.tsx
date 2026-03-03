import React from "react";

function CompnentThrowsError() {
  throw new Error();
  return <div />;
}

function ComponentA() {
  return <p>Component A</p>;
}

function ComponentB() {
  return <p>Component B</p>;
}

function Wrapper() {
  return (
    <section>
      <ComponentA />
      <CompnentThrowsError />
      <ComponentB />
    </section>
  );
}

export default Wrapper;
