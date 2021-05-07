import { Tag, Fish, FishId, Tags, Reduce } from "@actyx/pond";
import { type } from "os";
import {
  PickerFishState,
  PickerFishEvent,
  SetStateEvent,
  PickerFishTag,
} from "./types";

export const pickerFishName = "picker-fish";

const onEvent: Reduce<PickerFishState, PickerFishEvent> = (state, event) => {
  switch (event.eventType) {
    case "setState":
      return event.state;

    case "setStatus":
      if ("target_position" in state) {
        return {
          ...state,
          status: event.status,
        };
      }

    case "pickerMoveRequest":
      if (state.status === "ready") {
        return {
          ...state,
          status: "movement-queued",
        };
      }
      break;

    case "pickerTransportRequest":
      if (state.status === "ready") {
        return {
          ...state,
          status: "transport-queued",
          target_position: event.direction,
        };
      }
      break;

    default:
      break;
  }
  return state;
};

export const mkPickerFishTag = (machineID: string) =>
  PickerFishTag(pickerFishName).withId(machineID);

export const mkPickerFish = (
  machineID: string
): Fish<PickerFishState, PickerFishEvent> => ({
  fishId: FishId.of(pickerFishName, machineID, 1),
  where: mkPickerFishTag(machineID),
  initialState: {
    status: "undefined",
  },
  onEvent,
});
