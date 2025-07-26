import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { formCustomizationAtom } from "@/app/app/(dashboard)/forms/[form_id]/atoms";
import { useAtom } from "jotai";
import React, { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, X } from "lucide-react";
import { Uploader } from "@/components/modals/uploader";
import { FormCustomizations } from "@formsmith/shared";
import { GenericAlertDialog } from "@/components/ui/generic-alert-dialog";

const FormCustomization = ({
  showCustomization,
  setShowCustomization,
}: {
  showCustomization: boolean;
  setShowCustomization: (value: boolean) => void;
}) => {
  const [customizations, setCustomizations] = useAtom(formCustomizationAtom);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(customizations.theme || "light");
  if (!showCustomization) return <></>;

  console.log("here in custom", customizations);
  return (
    <div
      className={`relative flex w-[320px] justify-center border-l-2 border-gray-50 p-4`}
    >
      <GenericAlertDialog
        open={open}
        onOpenChange={setOpen}
        title="Changing the theme will reset all customizations"
        description="Are you sure you want to continue?"
        confirmLabel="Yes, change theme"
        cancelLabel="Cancel"
        onConfirm={() => {
          setCustomizations((prev: any) => ({
            ...prev,
            backgroundColor: theme === "light" ? "#ffffff" : "#1f1f1f",
            color: theme === "light" ? "#3f3f3f" : "#cfcfcf",
            buttonColor: theme === "light" ? "#000000" : "#FFFFFF",
            buttonText: theme === "light" ? "#FFFFFF" : "#000000",
            theme: theme,
          }));
        }}
      />
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
            if (value === "custom") {
              setCustomizations((prev: any) => ({
                ...prev,
                theme: value,
              }));
              return;
            }

            if (customizations.theme === "custom") {
              setTheme(value as any);
              setOpen(true);
              return;
            }

            setCustomizations((prev: any) => ({
              ...prev,
              backgroundColor: value === "light" ? "#ffffff" : "#1f1f1f",
              color: value === "light" ? "#3f3f3f" : "#cfcfcf",
              buttonColor: value === "light" ? "#000000" : "#FFFFFF",
              buttonText: value === "light" ? "#FFFFFF" : "#000000",
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
            <SelectItem value="custom">Custom</SelectItem>
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
                  theme: "custom",
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
                  theme: "custom",
                }));
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium">Button Color</p>
            <ColorPicker
              color={customizations.buttonColor}
              onChange={(color) => {
                setCustomizations((prev) => ({
                  ...prev,
                  buttonColor: color,
                  theme: "custom",
                }));
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium">Button Text</p>
            <ColorPicker
              color={customizations.buttonText}
              onChange={(color) => {
                setCustomizations((prev) => ({
                  ...prev,
                  buttonText: color,
                  theme: "custom",
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
              theme: "custom",
            }));
          }}
        />

        <p className="py-4 text-base font-bold">Layout</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <p className="font-medium">Page width</p>
            <div className="relative">
              <Input
                type="number"
                value={customizations.pageWidth ?? "800"}
                onChange={(e) => {
                  setCustomizations((prev: any) => ({
                    ...prev,
                    pageWidth: e.target.value,
                  }));
                }}
              ></Input>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                {`px`}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium">Base font size</p>
            <div className="relative">
              <Input
                type="number"
                value={customizations.baseFontSize ?? "16"}
                onChange={(e) => {
                  setCustomizations((prev: any) => ({
                    ...prev,
                    baseFontSize: e.target.value,
                  }));
                }}
              ></Input>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                {`px`}
              </span>
            </div>
          </div>
        </div>

        {customizations.logo && (
          <div className="mt-2 flex w-full justify-between gap-2">
            <div className="flex w-max flex-col gap-1">
              <p className="font-medium">Logo</p>
              <Uploader
                callback={(url) => {
                  setCustomizations((prev) => ({
                    ...prev,
                    logo: url,
                  }));
                }}
              >
                <img
                  src={customizations.logo}
                  alt="logo"
                  className="aspect-square h-[36px] w-[36px] rounded-lg"
                />
              </Uploader>
            </div>
            <div className="flex w-fit flex-col items-center gap-1">
              <p className="font-medium">Width</p>
              <div className="relative">
                <Input
                  type="number"
                  value={customizations.logoWidth ?? "100"}
                  onChange={(e) => {
                    setCustomizations((prev: any) => ({
                      ...prev,
                      logoWidth: e.target.value,
                    }));
                  }}
                  className="max-w-[60px] px-1 text-xs"
                ></Input>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                  {`px`}
                </span>
              </div>
            </div>
            <div className="flex w-fit flex-col items-center gap-1">
              <p className="font-medium">Height</p>
              <div className="relative">
                <Input
                  type="number"
                  value={customizations.logoHeight ?? "100"}
                  onChange={(e) => {
                    setCustomizations((prev: any) => ({
                      ...prev,
                      logoHeight: e.target.value,
                    }));
                  }}
                  className="max-w-[60px] px-1 text-xs"
                ></Input>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                  {`px`}
                </span>
              </div>
            </div>
            <div className="flex w-fit flex-col items-center gap-1">
              <p className="font-medium">Radius</p>
              <div className="relative">
                <Input
                  type="number"
                  value={customizations.logoCornerRadius ?? 50}
                  onChange={(e) => {
                    setCustomizations((prev: any) => ({
                      ...prev,
                      logoCornerRadius: e.target.value,
                    }));
                  }}
                  className="max-w-[50px] px-1 text-xs"
                ></Input>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                  {`%`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormCustomization;
