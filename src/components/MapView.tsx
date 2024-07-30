"use client";

import { MapContext } from "@/providers/map-provider";
import { DirectionsRenderer, GoogleMap, Marker } from "@react-google-maps/api";
import { CSSProperties, useContext, useEffect, useState } from "react";
import polilyne from "google-polyline";
import { darkMap } from "@/lib/map";

export const defaultMapContainerStyle: CSSProperties = {
  width: "100%",
  height: "800px",
};

export default function MapView() {
  const defaultMapZoom = 18;
  const defaultMapOptions: google.maps.MapOptions = {
    zoomControl: true,
    tilt: 0,
    gestureHandling: "auto",
    mapTypeControl: false,
    styles: process.env.USE_CUSTOM_MAP_STYLE ? darkMap : undefined,
  };

  const { location, origin, destination, stops, stopTime } =
    useContext(MapContext);

  const [routePath, setRoutePath] = useState<Array<[number, number]>>([]);

  const [center, setCenter] = useState(location);

  const [directions, setDirections] = useState<
    google.maps.DirectionsResult | null | undefined
  >();

  useEffect(() => {
    if (!origin || !destination) return;

    const DirectionsService = new google.maps.DirectionsService();

    DirectionsService.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (response != null && status === google.maps.DirectionsStatus.OK) {
          const way_points = polilyne.decode(
            response.routes[0].overview_polyline
          );
          setCenter({
            latitude: response.request.origin.location?.lat(),
            longitude: response.request.origin.location?.lng(),
          });
          setDirections(response);
          setRoutePath(way_points.slice(1, way_points.length - 1));
        } else {
          console.error(`error fetching directions ${response}`);
        }
      }
    );
  }, [origin, destination]);

  useEffect(() => {
    if (!stopTime || !stops.length) return;

    const DirectionsService = new google.maps.DirectionsService();

    const bMap = new Map();
    stopTime?.data?.forEach((stop: any) => {
      if (!bMap.has(stop.stop_id)) {
        bMap.set(stop.stop_id, []);
      }
      bMap.get(stop.stop_id).push(stop);
    });

    // Filter stops and preserve the order of stop_times sequence
    const waypoints = stops
      .filter((stop) => bMap.has(stop.stop_id))
      .flatMap((stop) => bMap.get(stop.stop_id))
      .sort((a, b) => a.stop_sequence - b.stop_sequence)
      .map((stop) => stops.find((a) => a.stop_id === stop.stop_id))
      .map((stop) => ({
        location: {
          lat: Number(stop.stop_lat),
          lng: Number(stop.stop_lon),
        },
        stopover: true,
      }));

    DirectionsService.route(
      {
        origin: waypoints[0].location,
        destination: waypoints[waypoints.length - 1].location,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
        waypoints: waypoints.slice(1, -1),
      },
      (response, status) => {
        if (response != null && status === google.maps.DirectionsStatus.OK) {
          const way_points = polilyne.decode(
            response.routes[0].overview_polyline
          );
          setCenter({
            latitude: response.request.origin.location?.lat(),
            longitude: response.request.origin.location?.lng(),
          });
          setDirections(response);
          setRoutePath(way_points.slice(1, way_points.length - 1));
        } else {
          console.error(`error fetching directions ${response}`);
        }
      }
    );
  }, [stopTime, stops]);

  function PolygonArray(latitude: number) {
    const R = 6378137;
    const pi = 3.14;
    //distance in meters
    const upper_offset = process.env.UPPER_AND_LOWER_BOUND_INCREMENT
      ? Number(process.env.UPPER_AND_LOWER_BOUND_INCREMENT)
      : 100;
    const lower_offset = -(process.env.UPPER_AND_LOWER_BOUND_INCREMENT
      ? Number(process.env.UPPER_AND_LOWER_BOUND_INCREMENT)
      : 100);
    const Lat_up = upper_offset / R;
    const Lat_down = lower_offset / R;
    //OffsetPosition, decimal degrees
    const lat_upper = latitude + (Lat_up * 180) / pi;
    const lat_lower = latitude + (Lat_down * 180) / pi;
    return [lat_upper, lat_lower];
  }

  function PolygonPoints(waypoints: Array<[number, number]>) {
    let polypoints = waypoints;
    let PolyLength = polypoints.length;
    let UpperBound = [];
    let LowerBound = [];
    for (let j = 0; j <= PolyLength - 1; j++) {
      let NewPoints = PolygonArray(polypoints[j][0]);
      UpperBound.push({ lat: NewPoints[0], lng: polypoints[j][1] });
      LowerBound.push({ lat: NewPoints[1], lng: polypoints[j][1] });
    }
    let reversebound = LowerBound.reverse();
    let FullPoly = UpperBound.concat(reversebound);
    return FullPoly;
  }

  const polygonBound = new google.maps.Polygon({
    paths: PolygonPoints(routePath),
  });

  const stopToMark = stopTime
    ? stops
        .filter((stop) =>
          stopTime?.data?.find((d: any) => d.stop_id == stop.stop_id)
        )
        .map((stop) => {
          const r = stopTime.data.find((st: any) => st.stop_id == stop.stop_id);
          if (r) {
            return {
              ...stop,
              ...r,
            };
          }
          return stop;
        })
    : stops.filter((stop) =>
        google.maps.geometry.poly.containsLocation(
          {
            lat: Number(stop.stop_lat),
            lng: Number(stop.stop_lon),
          },
          polygonBound
        )
      );

  return (
    <div className="w-full mt-10">
      <GoogleMap
        mapContainerStyle={defaultMapContainerStyle}
        center={center && { lat: center?.latitude, lng: center?.longitude }}
        zoom={defaultMapZoom}
        options={defaultMapOptions}
      >
        {directions && (
          <DirectionsRenderer
            options={{
              directions: directions,
            }}
          />
        )}
        {stopToMark?.map((stop) => (
          <Marker
            key={stop.stop_id}
            position={{
              lat: Number(stop.stop_lat),
              lng: Number(stop.stop_lon),
            }}
            title={`Name: ${stop.stop_name}\n ${
              stop.arrival_time ? `Arrival Time: ${stop.arrival_time}\n` : ""
            }${
              stop.departure_time
                ? `Departure Time: ${stop.departure_time}\n`
                : ""
            }`}
            animation={google.maps.Animation.DROP}
          />
        ))}
      </GoogleMap>
    </div>
  );
}
