import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { formCustomizationAtom } from "@/lib/atoms";
import { useAtom } from "jotai";
import React, { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, X } from "lucide-react";
import { Uploader } from "@/components/modals/uploader";

const FormCustomization = ({
  showCustomization,
  setShowCustomization,
}: {
  showCustomization: boolean;
  setShowCustomization: (value: boolean) => void;
}) => {
  const [customizations, setCustomizations] = useAtom(formCustomizationAtom);
  if (!showCustomization) return <></>;

  return (
    <div
      className={`relative flex w-[320px] justify-center border-l-2 border-gray-50 p-4`}
    >
      <div className="fixed bottom-0 top-0 mt-16 flex w-full max-w-[240px] flex-col gap-2 text-xs">
        <div className="flex w-full items-center justify-between pb-4">
          <p className="text-base font-bold">Customizations</p>
          <X
            className="h-4 w-4 cursor-pointer"
            onClick={() => setShowCustomization(false)}
          />
        </div>
        <p className="font-medium">Theme</p>
        <Select
          value={customizations.theme ?? "light"}
          onValueChange={(value) => {
            setCustomizations((prev) => ({
              ...prev,
              backgroundColor: value === "light" ? "#ffffff" : "#1f1f1f",
              color: value === "light" ? "#3f3f3f" : "#cfcfcf",
              theme: value,
            }));
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <p className="font-medium">Background</p>
            <ColorPicker
              color={customizations.backgroundColor ?? "#FFFFFF"}
              onChange={(color) => {
                setCustomizations((prev) => ({
                  ...prev,
                  backgroundColor: color,
                }));
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium">Text</p>
            <ColorPicker
              color={customizations.color ?? "#000000"}
              onChange={(color) => {
                setCustomizations((prev) => ({
                  ...prev,
                  color: color,
                }));
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium">Button Color</p>
            <ColorPicker
              color={customizations.buttonColor ?? "#FFFFFF"}
              onChange={(color) => {
                setCustomizations((prev) => ({
                  ...prev,
                  buttonColor: color,
                }));
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium">Button Text</p>
            <ColorPicker
              color={customizations.buttonText ?? "#000000"}
              onChange={(color) => {
                setCustomizations((prev) => ({
                  ...prev,
                  buttonText: color,
                }));
              }}
            />
          </div>
        </div>

        <p className="font-medium">Accent</p>
        <ColorPicker
          color={customizations.accentColor ?? "#026fd7"}
          onChange={(color) => {
            setCustomizations((prev) => ({
              ...prev,
              accentColor: color,
            }));
          }}
        />

        <p className="py-4 text-base font-bold">Layout</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <p className="font-medium">Page width {` (px)`}</p>
            <Input
              type="number"
              value={customizations.pageWidth ?? "800"}
              onChange={(e) => {
                setCustomizations((prev) => ({
                  ...prev,
                  pageWidth: e.target.value,
                }));
              }}
            ></Input>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium">Base font size {` (px)`}</p>
            <Input
              type="number"
              value={customizations.baseFontSize ?? "16"}
              onChange={(e) => {
                setCustomizations((prev) => ({
                  ...prev,
                  baseFontSize: e.target.value,
                }));
              }}
            ></Input>
          </div>
        </div>

        <div className="mt-2 flex w-full items-center">
          <div className="flex w-max flex-grow flex-col items-start gap-2 px-2">
            <p className="font-medium">Logo</p>
            <Uploader>
              <img
                src={customizations.logo}
                alt="logo"
                className="h-8 w-8 rounded-lg"
              />
            </Uploader>
          </div>
          <div className="flex w-full flex-col gap-2">
            <p className="font-medium">Width</p>
            <Input
              type="number"
              value={customizations.logoWidth ?? "100"}
              onChange={(e) => {
                setCustomizations((prev) => ({
                  ...prev,
                  logoWidth: e.target.value,
                }));
              }}
              className="text-xs"
            ></Input>
          </div>
          <div className="flex w-full flex-col gap-2">
            <p className="font-medium">Height</p>
            <Input
              type="number"
              value={customizations.logoHeight ?? "100"}
              onChange={(e) => {
                setCustomizations((prev) => ({
                  ...prev,
                  logoHeight: e.target.value,
                }));
              }}
              className="text-xs"
            ></Input>
          </div>
          <div className="flex w-full flex-col gap-2">
            <p className="font-medium">Radius</p>
            <Input
              type="number"
              value={customizations.logoCornerRadius ?? 50}
              onChange={(e) => {
                setCustomizations((prev) => ({
                  ...prev,
                  logoCornerRadius: e.target.value,
                }));
              }}
              className="text-xs"
            ></Input>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormCustomization;
