import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isAllowedModelEndpoint,
  joinEndpointPath,
  MODEL_API_PROVIDER_ALLOWED_HOSTS,
  type ModelApiProvider,
} from "./model-api-key";

const provider = "gpt" as ModelApiProvider;
const [allowedHost] = MODEL_API_PROVIDER_ALLOWED_HOSTS[provider];

describe("isAllowedModelEndpoint", () => {
  it("accepts https allowed host with default port", () => {
    assert.equal(
      isAllowedModelEndpoint(provider, `https://${allowedHost}/v1`),
      true
    );
  });

  it("rejects http", () => {
    assert.equal(
      isAllowedModelEndpoint(provider, `http://${allowedHost}/v1`),
      false
    );
  });

  it("rejects a custom port", () => {
    assert.equal(
      isAllowedModelEndpoint(provider, `https://${allowedHost}:8443/v1`),
      false
    );
  });

  it("rejects userinfo in the URL", () => {
    assert.equal(
      isAllowedModelEndpoint(provider, `https://user:pass@${allowedHost}/v1`),
      false
    );
  });

  it("rejects an unknown host", () => {
    assert.equal(
      isAllowedModelEndpoint(provider, "https://evil.example/v1"),
      false
    );
  });

  it("rejects a garbage string", () => {
    assert.equal(isAllowedModelEndpoint(provider, "not-a-url"), false);
  });
});

describe("joinEndpointPath", () => {
  it("does not duplicate a trailing segment", () => {
    assert.equal(
      joinEndpointPath(`https://${allowedHost}/v1/models`, "models"),
      `https://${allowedHost}/v1/models`
    );
  });
});
