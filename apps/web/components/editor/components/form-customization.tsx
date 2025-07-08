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
import { ChevronDown } from "lucide-react";

const FormCustomization = ({
  showCustomization,
}: {
  showCustomization: boolean;
}) => {
  const [customizations, setCustomizations] = useAtom(formCustomizationAtom);
  if (!showCustomization) return <></>;

  return (
    <div
      className={`relative flex w-[300px] justify-center border-l-2 border-gray-50 p-4`}
    >
      <div className="fixed bottom-0 top-0 mt-16 flex w-full max-w-[240px] flex-col gap-2 text-xs">
        <p className="font-bold">Theme</p>
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

        <p className="font-bold">Background Color</p>
        <ColorPicker
          color={customizations.backgroundColor ?? "#FFFFFF"}
          onChange={(color) => {
            setCustomizations((prev) => ({
              ...prev,
              backgroundColor: color,
            }));
          }}
        />

        <p className="font-bold">Text Color</p>
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
    </div>
  );
};

export default FormCustomization;
