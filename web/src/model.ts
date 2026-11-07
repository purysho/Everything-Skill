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

// Second and final candidate in this bounded comparison; admission is pending real measurements.
export const qwen35Candidate: ModelProfile = {
  "id": "qwen35-cpu",
  "model": "onnx-community/Qwen3.5-0.8B-ONNX-OPT",
  "revision": "9a4c21d8f724176b0a7edaaed36303044451886e",
  "dtype": "q4",
  "device": "wasm",
  "licence": "Apache-2.0",
  "licenceUrl": "https://huggingface.co/Qwen/Qwen3.5-0.8B/blob/2fc06364715b967f1860aea9cf38778875588b17/LICENSE",
  "rights": "established",
  "runtimeBytes": 50000000,
  "assets": [
    {
      "path": "config.json",
      "bytes": 2849,
      "sha256": "36fed6a902ccd06ef19a452bd5a0750bd88fe347d06ab75ef515615bac5b296d"
    },
    {
      "path": "tokenizer.json",
      "bytes": 19226111,
      "sha256": "89da80cc6689bef4d90cc1028249436975ffb0814618f1d93c65310e05801a9b"
    },
    {
      "path": "tokenizer_config.json",
      "bytes": 10069,
      "sha256": "5dcac2c1306b11d1e18ec4c024a174bded2ca3178ce87b0aa590711696407f3d"
    },
    {
      "path": "generation_config.json",
      "bytes": 248,
      "sha256": "dc0cbe66543f310896469b7b1448af792f403293a1080baaf04d586c57b23e48"
    },
    {
      "path": "chat_template.jinja",
      "bytes": 7755,
      "sha256": "273d8e0e683b885071fb17e08d71e5f2a5ddfb5309756181681de4f5a1822d80"
    },
    {
      "path": "onnx/decoder_model_merged_q4.onnx",
      "bytes": 576621,
      "sha256": "7390858c80a67275d8cb81fb70f66a24d3b86fe333057c1312de09c184a2d41b"
    },
    {
      "path": "onnx/decoder_model_merged_q4.onnx_data",
      "bytes": 483655680,
      "sha256": "1a9165072dd51a9b6a917b6357a3686372b7429313022802cd4c9a730e8c9749"
    },
    {
      "path": "onnx/embed_tokens_q4.onnx",
      "bytes": 857,
      "sha256": "8773dcf4858f855bfce13def4356ca17e0bc516a477154496b6ffb6dd6d084dc"
    },
    {
      "path": "onnx/embed_tokens_q4.onnx_data",
      "bytes": 162897920,
      "sha256": "9210b1d26eb14136d3522584d17da14cc5f4b82b6f5607e6d80d59424a8cbe99"
    }
  ]
};

assertProfile(qwen35Candidate);
export const candidates = [candidate, qwen35Candidate] as const;
