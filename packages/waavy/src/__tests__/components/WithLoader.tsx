import React from "react";

type ItemProps = {
  id: string;
  content: string;
};

const Item = (props: ItemProps) => <li id={props.id}>{props.content}</li>;

type ListProps = {
  items: ItemProps[];
};

const List = (props: ListProps) => (
  <ul>
    {props.items.map((item) => (
      <Item key={JSON.stringify(item)} {...item} />
    ))}
  </ul>
);

type MainProps = {
  items: ItemProps[];
};

const Main = ({ items }: MainProps) => <List items={items} />;

export default Main;

export async function getServerSideProps() {
  return {
    data: {
      items: Array.from({ length: 100 }, (_, index) => ({
        id: `item-${index}`,
        content: "Item #" + index,
      })),
    },
  };
}
