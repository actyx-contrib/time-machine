import { Pond } from "@actyx/pond";
import { mkPickerFishTag } from "./picker-fish";
import { Direction } from "./types";

export function emitTransportRequestEvent(
  pond: Pond,
  machineId: string,
  direction: Direction
) {
  pond.emit(mkPickerFishTag(machineId), {
    eventType: "pickerTransportRequest",
    direction: direction,
    machineId: machineId,
  });
}
