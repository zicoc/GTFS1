"use client";

import transformToJSON from "@/lib/file";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { useEffect, useState, useTransition } from "react";
import { ArrowRightIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Button, IconButton } from "@material-tailwind/react";

export default function Entities() {
  const entities = [
    "Agency",
    "Calendar",
    "Calendar_dates",
    "Routes",
    "Shapes",
    "Stops",
    "Stop_times",
    "Trips",
  ];

  const [entity, setEntity] = useState("agency");

  const [page, setPage] = useState(0);

  const [items, setItems] = useState<any[]>();

  const [isPending, startTransition] = useTransition();

  const [active, setActive] = useState(1);

  const getItemProps = (index: number) =>
    ({
      variant: active === index ? "filled" : "text",
      color: "gray",
      onClick: () => setActive(index),
    } as any);

  const next = () => {
    setPage((prev) => prev + 1);
    if (active === 5) return;
    setActive(active + 1);
  };

  const prev = () => {
    setPage((prev) => (prev ? prev - 1 : 0));
    if (active === 1) return;
    setActive(active - 1);
  };

  const onEntity = (value: string) => {
    setEntity(value);
    setPage(0);
    setActive(1);
    startTransition(async () => {
      const data = await transformToJSON(`${entity}.txt`);
      setItems(data);
    });
  };

  useEffect(() => {
    (async function loadData() {
      const data = await transformToJSON(`${entity}.txt`);
      setItems(data);
    })();
  }, []);

  const headers = Object.keys(items?.length ? items[0] : {});

  return (
    <div className="flex-1">
      <span className="mr-10">Entities:</span>
      <Listbox value={entity} onChange={onEntity}>
        <ListboxButton>{entity}</ListboxButton>
        <ListboxOptions anchor="bottom">
          {entities.map((e) => (
            <ListboxOption
              key={e}
              value={e.toLowerCase()}
              className="group flex gap-2 bg-green-400 data-[focus]:bg-blue-100"
            >
              <CheckIcon className="invisible size-5 group-data-[selected]:visible" />
              {e}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
      <div>
        <table className="table-fixed mt-10">
          {/* using table because of timeless */}
          {!isPending && headers && items ? (
            <>
              <thead>
                <tr>
                  {headers.map((h: any) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.slice(page, 12).map((item, index) => (
                  <tr key={item[headers[0]] + "" + index}>
                    {headers.map((h) => (
                      <td key={h}>{item[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </>
          ) : (
            <span>
              <svg
                className="animate-spin h-5 w-5 mr-3 ..."
                viewBox="0 0 24 24"
              ></svg>
            </span>
          )}
        </table>
      </div>
      <div className="flex items-center gap-4 mt-10">
        <Button
          variant="text"
          className="flex items-center gap-2"
          onClick={prev}
          disabled={active === 1}
        >
          <ArrowLeftIcon strokeWidth={2} className="h-4 w-4" /> Previous
        </Button>
        <div className="flex items-center gap-2">
          <IconButton {...getItemProps(1)}>1</IconButton>
          <IconButton {...getItemProps(2)}>2</IconButton>
          <IconButton {...getItemProps(3)}>3</IconButton>
          <IconButton {...getItemProps(4)}>4</IconButton>
          <IconButton {...getItemProps(5)}>5</IconButton>
        </div>
        <Button
          variant="text"
          className="flex items-center gap-2"
          onClick={next}
          disabled={active === 5}
        >
          Next
          <ArrowRightIcon strokeWidth={2} className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
