import { eventType, Inngest, staticSchema } from "inngest";

export type KbBuildRequestedData = {
  kbId: string;
  persistent: boolean;
};

export type KbBuildVideoData = {
  kbId: string;
  videoId: string;
  persistent: boolean;
};

export const kbBuildRequestedEvent = eventType("kb/build.requested", {
  schema: staticSchema<KbBuildRequestedData>(),
});

export const kbBuildVideoEvent = eventType("kb/build.video", {
  schema: staticSchema<KbBuildVideoData>(),
});

export const inngest = new Inngest({ id: "tubecp" });
