import { describe, expect, it } from "vitest";

import { channelLabel, channelLabelKey, channelTone } from "../../src/renderer/components/ChannelBadge";

describe("channel badge", () => {
  it("formats source platform values used by customer service thread lists", () => {
    expect(channelLabelKey("h5")).toBe("channel.h5");
    expect(channelLabelKey("miniprogram")).toBe("channel.miniprogram");
    expect(channelLabel("miniprogram")).toBe("Mini Program");
    expect(channelTone("miniprogram")).toBe("web");
  });
});
