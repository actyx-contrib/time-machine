import { Fish, FishId, Reduce, Tag } from "@actyx/pond";
import { OvenFishEvent, OvenFishTag, OvenRegistryState } from "./types";
import { List } from "immutable";
import { ovenFishName } from "./oven-fish";

const onEvent: Reduce<OvenRegistryState, OvenFishEvent> = (state, event) => {
  if (state.machineIds.some((machineID) => machineID === event.machineId)) {
    return state;
  } else {
    return { machineIds: state.machineIds.push(event.machineId) };
  }
};

export const ovenRegistryFish: Fish<OvenRegistryState, OvenFishEvent> = {
  fishId: FishId.of(ovenFishName, "singleton", 1),
  where: OvenFishTag(ovenFishName),
  initialState: {
    machineIds: List(),
  },
  onEvent,
};
