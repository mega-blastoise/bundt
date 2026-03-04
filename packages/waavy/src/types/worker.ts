import type { CacheEntryWithRenderOutput } from "@/cli/RenderAction/utils/cache/types";
import type { RenderActionOptions, SerializableObject } from "./index";

export const WorkerMessageDataAction = {
  Cache: "cache",
} as const;

export type WorkerMessageDataAction = (typeof WorkerMessageDataAction)[keyof typeof WorkerMessageDataAction];

export interface WorkerMessageData<T = SerializableObject> {
  action: WorkerMessageDataAction;
  payload: T;
}

export type WorkerCacheMessageData = WorkerMessageData;

export type CacheRenderOutputMessagePayload = Omit<
  CacheEntryWithRenderOutput,
  "id" | "createdAt" | "props"
> & {
  cacheType: Required<RenderActionOptions["cacheType"]>;
  props: SerializableObject;
};

export interface CacheRenderOutputOptions<Props extends SerializableObject = SerializableObject> {
  cacheKey: string;
  cacheType: "bunfs" | "bunsqlite3";
  component: {
    name: string;
    path: string;
    props: Props;
    cacheableRenderOutput: string;
  };
}
