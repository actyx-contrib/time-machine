import { Tag, Fish, FishId, Tags, Reduce } from "@actyx/pond";
import { type } from "os";
import {
  OvenFishState,
  OvenFishEvent,
  SetStateEvent,
  OvenFishTag,
} from "./types";

export const ovenFishName = "oven-fish";

const onEvent: Reduce<OvenFishState, OvenFishEvent> = (state, event) => {
  switch (event.eventType) {
    case "setState":
      return event.state;

    case "ovenStartRequest":
      if (state.status === "ready") {
        return {
          status: "queued",
        };
      }
      return state;
    default:
      return state;
  }
};

export const mkOvenFishTag = (machineID: string) =>
  OvenFishTag(ovenFishName).withId(machineID);

export const mkOvenFish = (
  machineID: string
): Fish<OvenFishState, OvenFishEvent> => ({
  fishId: FishId.of(ovenFishName, machineID, 1),
  where: mkOvenFishTag(machineID),
  initialState: {
    status: "undefined",
  },
  onEvent,
});
