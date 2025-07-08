"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Helper functions for color conversion
const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const hexToHsl = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
};

const normalizeColor = (c: string) => (c.startsWith("#") ? c.toUpperCase() : c);

const trimColorString = (color: string, maxLength: number = 20): string => {
  if (color.length <= maxLength) return color;
  return `${color.slice(0, maxLength - 3)}...`;
};

export function ColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  const [hex, setHex] = useState(() => normalizeColor(color));
  const [hsl, setHsl] = useState<[number, number, number]>(() => hexToHsl(hex));
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const normalized = normalizeColor(color);
    setHex(normalized);
    setHsl(hexToHsl(normalized));
  }, [color]);

  const applyHsl = (newHsl: [number, number, number]) => {
    setHsl(newHsl);
    const newHex = hslToHex(...newHsl);
    setHex(newHex);
    onChange(newHex);
  };

  const handleSatLightClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, width, top, height } =
      e.currentTarget.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    const s = Math.round((x / width) * 100);
    const l = Math.round(100 - (y / height) * 100);
    applyHsl([hsl[0], s, l]);
  };

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const h = Number(e.target.value);
    applyHsl([h, hsl[1], hsl[2]]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toUpperCase();
    setHex(v);
    if (/^#[0-9A-F]{6}$/.test(v)) {
      setHsl(hexToHsl(v));
      onChange(v);
    }
  };

  const colorPresets = [
    "#FF3B30",
    "#FF9500",
    "#FFCC00",
    "#4CD964",
    "#5AC8FA",
    "#007AFF",
    "#5856D6",
    "#FF2D55",
    "#8E8E93",
    "#EFEFF4",
    "#E5E5EA",
    "#D1D1D6",
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start p-0 px-2 text-left font-normal"
        >
          <div
            className="mr-2 aspect-square h-4 w-4 rounded-full shadow-sm"
            style={{ backgroundColor: hex }}
          />
          <span className="flex-grow truncate text-[0.75rem]">{hex}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-full p-1">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <motion.div
            className="relative h-40 w-full cursor-crosshair overflow-hidden rounded-lg"
            style={{
              background: `
                linear-gradient(to top, rgba(0,0,0,1), transparent),
                linear-gradient(to right, rgba(255,255,255,1), transparent),
                hsl(${hsl[0]},100%,50%)
              `,
            }}
            onClick={handleSatLightClick}
          >
            <motion.div
              className="absolute h-4 w-4 rounded-full border-2 border-white shadow-md"
              style={{
                left: `${hsl[1]}%`,
                top: `${100 - hsl[2]}%`,
                backgroundColor: `hsl(${hsl[0]},${hsl[1]}%,${hsl[2]}%)`,
              }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          </motion.div>
          <motion.input
            type="range"
            min={0}
            max={360}
            value={hsl[0]}
            onChange={handleHueChange}
            className="h-3 w-full cursor-pointer appearance-none rounded-full"
            style={{
              background: `linear-gradient(to right,
                hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%),
                hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%),
                hsl(360,100%,50%)
              )`,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          />
          <div className="flex items-center space-x-2">
            <Label htmlFor="color-input" className="sr-only">
              Color
            </Label>
            <Input
              id="color-input"
              type="text"
              value={hex}
              onChange={handleInputChange}
              className="h-8 flex-grow rounded-md border border-gray-300 bg-white px-2 text-sm"
              placeholder="#RRGGBB"
            />
            <motion.div
              className="h-8 w-8 rounded-md shadow-sm"
              style={{ backgroundColor: hex }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            />
          </div>
          <div className="grid grid-cols-6 gap-2">
            <AnimatePresence>
              {colorPresets.map((preset) => (
                <motion.button
                  key={preset}
                  className="relative h-8 w-8 rounded-full"
                  style={{ backgroundColor: preset }}
                  onClick={() => applyHsl(hexToHsl(preset))}
                  whileHover={{ scale: 1.2, zIndex: 1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {hex === preset && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}
