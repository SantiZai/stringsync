import sharp from "sharp";
import { mkdirSync } from "node:fs";

const BG = "#c4000d"; // tu --primary en hex
const FG = "#ffffff";

const glyph = `
  <path d="M22 9.5C22 9.5 20 7 16 7C12.5 7 10.5 8.8 10.5 11C10.5 13.4 12.8 14.3 16 15.5C19.2 16.7 21.5 17.6 21.5 20C21.5 22.2 19.5 24 16 24C12 24 10 21.5 10 21.5"
        fill="none" stroke="${FG}" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="22" cy="9.5" r="1.7" fill="${FG}"/>
  <circle cx="10" cy="21.5" r="1.7" fill="${FG}"/>`;

// scale: tamaño de la S dentro del cuadrado. rx: esquinas redondeadas (0 = cuadrado completo)
const build = ({ scale, rx }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="${rx}" fill="${BG}"/>
  <g transform="translate(16 16) scale(${scale}) translate(-16 -15.5)">${glyph}</g>
</svg>`;

const icons = [
  { file: "public/icon-192.png", size: 192, scale: 1.25, rx: 9 },
  { file: "public/icon-512.png", size: 512, scale: 1.25, rx: 9 },
  // maskable: fondo completo y S dentro de la zona segura (Android recorta los bordes)
  { file: "public/icon-maskable-512.png", size: 512, scale: 1.0, rx: 0 },
  // iOS aplica sus propias esquinas, así que va cuadrado
  { file: "app/apple-icon.png", size: 180, scale: 1.15, rx: 0 },
];

mkdirSync("public", { recursive: true });

for (const { file, size, scale, rx } of icons) {
  await sharp(Buffer.from(build({ scale, rx })), { density: 600 })
    .resize(size, size)
    .png()
    .toFile(file);
  console.log("✔", file);
}
