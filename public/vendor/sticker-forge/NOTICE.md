Sticker Forge by CatsJuice — MIT License (see LICENSE).
Source: https://github.com/CatsJuice/sticker-forge
Revision: 068caa49eef69745564a5debbc01bab3fcd31042
The distributed IIFE bundle is lazy-loaded locally for Trip / Recall's peel/press animation. Its bundled rendering dependencies retain their embedded license notices. No remote service or sound is enabled.

Local modification: the reverse-face fragment shader adds a UV-bound diamond/rosette watermark and subtle laid-paper lines. The authored GLSL is in back-watermark.glsl and the exact upstream shader diff in back-watermark.patch. Curl geometry, lighting, input and shadow calculations remain upstream. The adapter sets a neutral warm-gray gum-paper back (#e7e4d8).
