"use server";

import { promises as fs } from "fs";

let map: any = {};

export default async function transformToJSON(entity: string) {
  if (map[entity]) return Promise.resolve(map[entity]);

  try {
    const file = await fs.readFile(
      process.cwd() + `/src/lib/entities/${entity}`,
      "utf8"
    );
    const rows = file.trim().split("\n");
    const header = rows?.shift()?.split(",");
    const data = rows.map((row) => {
      const values = row.split(",");
      return header?.reduce((obj, field, index) => {
        obj[field] = values[index];
        return obj;
      }, {} as any);
    });

    map[entity] = data;
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
}
