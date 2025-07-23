import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { formCustomizationAtom } from "@/lib/atoms";
import { useAtom } from "jotai";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
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
              color={
                (customizations.buttonColor ?? customizations.theme === "dark")
                  ? "#FFFFFF"
                  : "#000000"
              }
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
              color={
                (customizations.buttonText ?? customizations.theme === "dark")
                  ? "#000000"
                  : "#FFFFFF"
              }
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
            <p className="font-medium">Page width</p>
            <div className="relative">
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
                  setCustomizations((prev) => ({
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
                    setCustomizations((prev) => ({
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
                    setCustomizations((prev) => ({
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
                    setCustomizations((prev) => ({
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
