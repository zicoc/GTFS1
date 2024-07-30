"use client";

import StopPointsDialog from "@/components/StopPointsDialog";
import transformToJSON from "@/lib/file";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Description,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { Libraries, useJsApiLoader } from "@react-google-maps/api";
import {
  ChangeEvent,
  createContext,
  Fragment,
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";

const libraries = ["places", "drawing", "geometry"];

export const MapContext = createContext<{
  location?: {
    latitude: number;
    longitude: number;
  };
  stops: any[];
  stopTimes: any[];
  stopTime?: any;
  origin?: google.maps.LatLngLiteral;
  destination?: google.maps.LatLngLiteral;
}>({ stops: [], stopTimes: [] });

export function MapProvider({
  children,
  stops,
}: PropsWithChildren & { stops: any[] }) {
  const { isLoaded: scriptLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API as string,
    libraries: libraries as Libraries,
  });

  const [isOpen, setIsopen] = useState(false);
  const [isOpen1, setIsopen1] = useState(false);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  }>();

  const [origin, setOrigin] = useState<any>();
  const [destination, setDestination] = useState<any>();
  const [stopTimes, setStoptimes] = useState<any[]>([]);
  const [stopTime, setStoptime] = useState<any>();
  const [query, setQuery] = useState<string>("");
  const [filtered, setFiltered] = useState<any[]>([]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        const { latitude, longitude } = coords;
        setLocation({ latitude, longitude });
      });
    }
    (async function () {
      const st = await transformToJSON("stop_times.txt");
      setStoptimes(st);
    })();
  }, []);

  const [label, setLabel] = useState<
    "Origin" | "Destination" | "Trip" | undefined
  >();

  const [isPending, startTransition] = useTransition();

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    startTransition(() => {
      setFiltered(
        query?.trim()?.length < 3
          ? stop_times
          : stop_times.filter((stop) =>
              stop.trip_id.toLowerCase().includes(query.toLowerCase())
            )
      );
    });
  };

  const close = () => {
    setIsopen(false);
    setIsopen1(false);
  };

  const onStopPoint = useCallback(
    (value: any) => {
      if (label === "Origin") setOrigin(value);
      else setDestination(value);
      setStoptime(undefined);
      setIsopen(false);
    },
    [label]
  );

  const onTrip = useCallback(
    (value: any) => {
      setStoptime(value);
      setOrigin(undefined);
      setDestination(undefined);
      setIsopen1(false);
    },
    [label]
  );

  if (loadError) return <p>Encountered error while loading google maps</p>;

  if (!scriptLoaded) return <span className="sr-only">Loading...</span>;

  const stop_times_data = stopTimes.reduce((acc, curr) => {
    if (!acc[curr.trip_id]) {
      acc[curr.trip_id] = [];
    }
    acc[curr.trip_id] = [
      ...acc[curr.trip_id],
      {
        stop_id: curr.stop_id,
        departure_time: curr.departure_time,
        arrival_time: curr.arrival_time,
        stop_sequence: curr.stop_sequence,
      },
    ];
    return acc;
  }, {});

  const stop_times = Object.keys(stop_times_data).map((key) => ({
    trip_id: key,
    data: (stop_times_data[key] as Array<any>).sort(
      // sorts stop points by stop sequence
      (a, b) => a.stop_sequence - b.stop_sequence
    ),
  }));

  return (
    <MapContext.Provider
      value={{
        location,
        stops,
        origin: origin && {
          lat: Number(origin.stop_lat),
          lng: Number(origin.stop_lon),
        },
        destination: destination && {
          lat: Number(destination.stop_lat),
          lng: Number(destination.stop_lon),
        },
        stopTimes: stop_times,
        stopTime,
      }}
    >
      <div className="grid gap-6 md:grid-cols-2 mb-100">
        <div>
          <div
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            onClick={() => {
              setLabel("Origin");
              setIsopen(true);
            }}
          >
            <span>{origin ? origin.stop_name : "Enter Origin"}</span>
          </div>
        </div>
        <div className="mt-10">
          <div
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            onClick={() => {
              setLabel("Destination");
              setIsopen(true);
            }}
          >
            <span>
              {destination ? destination.stop_name : "Enter Destination"}
            </span>
          </div>
        </div>
        <h1 className="mt-10 text-center">OR</h1>
        <div className="mt-10">
          <label>Trip</label>
          <div
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            onClick={() => {
              setIsopen1(true);
            }}
          >
            <span>{stopTime ? stopTime.trip_id : "Choose a trip"}</span>
          </div>
        </div>
      </div>
      {children}
      <StopPointsDialog
        isOpen={isOpen}
        close={close}
        label={label}
        selected={label === "Origin" ? origin : destination}
        onSelect={onStopPoint}
      />
      <StopPointsDialog
        isOpen={isOpen1}
        close={close}
        label={label}
        selected={stopTime}
        onSelect={onTrip}
      >
        <DialogPanel className="flex-1/3 w-1/3 h-2/3 rounded bg-white p-4">
          <DialogTitle className="text-center text-2xl">{label}</DialogTitle>
          <Description>Choose a value</Description>
          <Combobox value={stopTime} onChange={onTrip}>
            <ComboboxInput
              onChange={onChange}
              displayValue={(stop: any) => stop?.trip_id ?? ""}
              className="w-full mt-4"
              autoFocus
            />
            {isPending ? (
              <div className="text-center mt-10">
                <div role="status">
                  <svg
                    aria-hidden="true"
                    className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="currentFill"
                    />
                  </svg>
                  <span className="sr-only">Loading...</span>
                </div>
              </div>
            ) : (
              <ComboboxOptions className="flex-1">
                {filtered.map((stop) => (
                  <ComboboxOption key={stop.trip_id} value={stop} as={Fragment}>
                    {({ selected, focus }) => (
                      <li
                        className={`w-full ${
                          focus
                            ? "bg-blue-500 text-white"
                            : "bg-white text-black"
                        }`}
                      >
                        {selected && <CheckIcon />}
                        {stop.trip_id}
                      </li>
                    )}
                  </ComboboxOption>
                ))}
              </ComboboxOptions>
            )}
          </Combobox>
        </DialogPanel>
      </StopPointsDialog>
    </MapContext.Provider>
  );
}
