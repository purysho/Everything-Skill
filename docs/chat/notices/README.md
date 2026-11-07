# Browser inference notices

The Everything Skill application remains under PolyForm Noncommercial 1.0.0. These upstream components and candidate weights retain their own terms.

| Component | Pinned evidence | Licence |
| --- | --- | --- |
| Transformers.js | npm 4.3.2, package LICENSE copied unchanged | Apache 2.0 |
| Hugging Face tokenizers | Installed lockfile version, package LICENSE copied unchanged | Apache 2.0 |
| Hugging Face Jinja | Installed lockfile version, package LICENSE copied unchanged | MIT |
| ONNX Runtime Web | npm 1.31.0-dev.20260914-8d85527a0, upstream LICENSE at commit prefix 8d85527a0 copied unchanged | MIT |
| Qwen3-0.6B-Instruct ONNX candidate | onnx-community revision 54250909aca286a05b9d013c8af7a21859ee6ead | Apache 2.0 declaration in model card |
| Modified upstream Qwen | minpeter/Qwen3-0.6B-Instruct revision 22392feff2cdfab4188bc8293c461fd9144cc558, LICENSE copied unchanged | Apache 2.0 |

The converter identifies its source as minpeter/Qwen3-0.6B-Instruct, whose card identifies Qwen/Qwen3-0.6B. The modified upstream card describes extracting the chat template and changing thinking-mode template logic. The ONNX converter describes conversion through the onnx-community conversion Space. Everything Skill does not modify these weights. Their actual loaded files and hashes are recorded in web/src/model.ts. The model is a feasibility candidate, with quality and physical-device support subject to MODEL_GATE.md.

Only the Apache/MIT declarations and public provenance chain are established by this review. A model card does not certify training-data rights or model safety. Runtime dependency advisories and payload/runtime behavior require separate checks. The build preserves bundled upstream legal comments. Before a public inference release, the built artifact must carry all applicable direct and transitive dependency notices, including the separate ONNX Runtime third-party notices.

Sources:

- https://huggingface.co/onnx-community/Qwen3-0.6B-Instruct-ONNX/blob/54250909aca286a05b9d013c8af7a21859ee6ead/README.md
- https://huggingface.co/minpeter/Qwen3-0.6B-Instruct/blob/22392feff2cdfab4188bc8293c461fd9144cc558/README.md
- https://huggingface.co/minpeter/Qwen3-0.6B-Instruct/blob/22392feff2cdfab4188bc8293c461fd9144cc558/LICENSE
- https://github.com/microsoft/onnxruntime/blob/8d85527a0/LICENSE
