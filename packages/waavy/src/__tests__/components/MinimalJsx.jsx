import React from "react";

const Minimal = (props) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section id="minimal-component-example">
      <h1>The Rainbow Connection</h1>
      <small>
        by <b>Kermit the Frog (at some point)</b>
      </small>

      <pre>
        Why are there so many songs about rainbows? And what's on the other side? Rainbows are visions, but
        only illusions; And rainbows have nothing to hide, So I've been told, and some choose to believe it. I
        know they're wrong wait and see. One day we'll find it,
        <i>The Rainbow Connection</i>
        The lovers, the dreamers, and me.
      </pre>
    </section>
  );
};

const Minimal2 = Minimal.bind({});

Minimal.displayName = "Azathoth";
Minimal2.displayName = "Nyarlathotep";

export default Minimal;

export { Minimal2 };
