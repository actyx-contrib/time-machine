import { Fish, FishId, Reduce, Tag } from "@actyx/pond";
import { PickerFishEvent, PickerFishTag, PickerRegistryState } from "./types";
import { List } from "immutable";
import { pickerFishName } from "./picker-fish";

const onEvent: Reduce<PickerRegistryState, PickerFishEvent> = (
  state,
  event
) => {
  if (state.machineIds.some((machineID) => machineID === event.machineId)) {
    return state;
  } else {
    return { machineIds: state.machineIds.push(event.machineId) };
  }
};

export const pickerRegistryFish: Fish<PickerRegistryState, PickerFishEvent> = {
  fishId: FishId.of(pickerFishName, "singleton", 1),
  where: PickerFishTag(pickerFishName),
  initialState: {
    machineIds: List(),
  },
  onEvent,
};
