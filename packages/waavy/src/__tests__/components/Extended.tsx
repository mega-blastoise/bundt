import React from "react";

const Image = React.memo(() => (
  <img src="https://picsum.photos/200/300.webp" height="200" width="300" alt="random image" />
));

const Button = React.memo(() => {
  const [count, setCount] = React.useState(0);
  const onClick = React.useCallback(() => setCount(count + 1), [setCount]);
  return <button onClick={onClick}>Count {count}</button>;
});

export interface Props {
  items: string[];
}

const Extended: React.FC<Props> = (props: Props) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const memoizedText = React.useMemo(() => {
    return "Hello world";
  }, []);

  return (
    <section data-test="extended-component-example" id="exteneded-component-root">
      <h1>Extended Component</h1>
      <Image />
      <Button />
      {mounted && <p>Mounted in the browser</p>}
      {props.items.map((item) => (
        <p key={item}>{item}</p>
      ))}
      {memoizedText}
    </section>
  );
};

export default Extended;
