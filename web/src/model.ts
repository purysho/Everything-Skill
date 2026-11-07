import { assertProfile, type ModelProfile } from '../../src/chat-model.js';

// Rights-reviewed candidate. Device support is pending MODEL_GATE.md acceptance.
export const candidate: ModelProfile = {
  "id": "qwen3-cpu",
  "model": "onnx-community/Qwen3-0.6B-Instruct-ONNX",
  "revision": "54250909aca286a05b9d013c8af7a21859ee6ead",
  "dtype": "q4",
  "device": "wasm",
  "licence": "Apache-2.0",
  "licenceUrl": "https://huggingface.co/minpeter/Qwen3-0.6B-Instruct/blob/22392feff2cdfab4188bc8293c461fd9144cc558/LICENSE",
  "rights": "established",
  "runtimeBytes": 50000000,
  "assets": [
    {
      "path": "config.json",
      "bytes": 1359,
      "sha256": "c62bd6f68dc0d4d2436c86ad002a81ac6c8b9029837b8ea5f5404811eb465529"
    },
    {
      "path": "tokenizer.json",
      "bytes": 11422654,
      "sha256": "aeb13307a71acd8fe81861d94ad54ab689df773318809eed3cbe794b4492dae4"
    },
    {
      "path": "tokenizer_config.json",
      "bytes": 5404,
      "sha256": "443bfa629eb16387a12edbf92a76f6a6f10b2af3b53d87ba1550adfcf45f7fa0"
    },
    {
      "path": "generation_config.json",
      "bytes": 214,
      "sha256": "64d86df2173901c58389974bde21f7d2ab9eb7d79f35a337753329d39cf265c0"
    },
    {
      "path": "chat_template.jinja",
      "bytes": 3645,
      "sha256": "b692e04b8bbd2723e45851897691899d7b4b5abb4974ed99ac60331b5001a99d"
    },
    {
      "path": "onnx/model_q4.onnx",
      "bytes": 996522744,
      "sha256": "a1efc0c2ec91473bcd8cd27b2a25d50452252eac5a5d582722cbdc7d8e11f13d"
    }
  ]
};

assertProfile(candidate);
