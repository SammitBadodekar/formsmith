import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { formCustomizationAtom } from "@/lib/atoms";
import { useAtom } from "jotai";
import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDownToDot,
  ArrowRightFromLine,
  MoveHorizontal,
  X,
} from "lucide-react";
import { Uploader } from "@/components/modals/uploader";
import { GenericAlertDialog } from "@/components/ui/generic-alert-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { H4, Muted, P } from "@/components/ui/typography";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  darkModeCustomizations,
  lightModeCustomizations,
} from "@formsmith/shared";

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

  return (
    <div
      className={`relative flex w-[380px] justify-center border-l-2 border-gray-50 p-4`}
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
            ...(theme === "light"
              ? lightModeCustomizations
              : darkModeCustomizations),
            theme: theme,
          }));
        }}
      />
      <div className="hide-scrollbar fixed bottom-0 top-0 mt-16 flex h-[calc(100dvh_-_56px)] w-full max-w-[280px] flex-col gap-2 overflow-y-scroll pb-8 text-xs">
        <div className="flex w-full items-center justify-between pb-4">
          <H4>Customizations</H4>
          <X
            className="h-4 w-4 cursor-pointer"
            onClick={() => setShowCustomization(false)}
          />
        </div>
        <Muted className="text-xs">Theme</Muted>
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
              ...(value === "light"
                ? lightModeCustomizations
                : darkModeCustomizations),
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
            <Muted className="text-xs">Background</Muted>
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
            <Muted className="text-xs">Text</Muted>
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
            <Muted className="text-xs">Button Color</Muted>
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
            <Muted className="text-xs">Button Text</Muted>
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

        {/* <Muted className="text-xs">Accent</Muted>
        <ColorPicker
          color={customizations.accentColor ?? "#026fd7"}
          onChange={(color) => {
            setCustomizations((prev) => ({
              ...prev,
              accentColor: color,
              theme: "custom",
            }));
          }}
        /> */}

        <H4 className="py-4">Layout</H4>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <Muted className="text-xs">Page width</Muted>
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
            <Muted className="text-xs">Base font size</Muted>
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
              <Muted className="text-xs">Logo</Muted>
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
              <Muted className="text-xs">Width</Muted>
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
              <Muted className="text-xs">Height</Muted>
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
              <Muted className="text-xs">Radius</Muted>
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

        {customizations.image && (
          <div className="mt-2 grid w-full grid-cols-2 gap-2">
            <div className="flex w-full flex-col gap-1">
              <Muted className="text-xs">Cover image</Muted>
              <Uploader
                callback={(url) => {
                  setCustomizations((prev) => ({
                    ...prev,
                    image: url,
                  }));
                }}
              >
                <img
                  src={customizations.image}
                  alt="logo"
                  className="h-[36px] w-full rounded-lg object-cover"
                />
              </Uploader>
            </div>
            <div className="flex w-fit flex-col items-center gap-1">
              <Muted className="text-xs">Height</Muted>
              <div className="relative">
                <Input
                  type="number"
                  value={customizations.imageHeight ?? "200"}
                  onChange={(e) => {
                    setCustomizations((prev: any) => ({
                      ...prev,
                      imageHeight: e.target.value,
                    }));
                  }}
                  className="px-1 text-xs"
                ></Input>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                  {`px`}
                </span>
              </div>
            </div>
          </div>
        )}

        <H4 className="py-4">Inputs</H4>
        <div className="flex w-full gap-2">
          <div className="col-start-1 col-end-3 flex flex-col gap-2">
            <Muted className="text-xs">Width</Muted>
            <div className="flex justify-center rounded-md bg-primary/5 p-0.5">
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={customizations.inputsWidthType}
              >
                {/* <ToggleGroupItem
                  value="auto"
                  onClick={() =>
                    setCustomizations((prev) => ({
                      ...prev,
                      inputsWidthType: "auto",
                    }))
                  }
                >
                  <Tooltip>
                    <TooltipTrigger>
                      <ArrowRightFromLine />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-bold">Auto width</p>
                    </TooltipContent>
                  </Tooltip>
                </ToggleGroupItem> */}
                <ToggleGroupItem
                  value="full"
                  onClick={() =>
                    setCustomizations((prev) => ({
                      ...prev,
                      inputsWidthType: "full",
                    }))
                  }
                >
                  <Tooltip>
                    <TooltipTrigger>
                      <MoveHorizontal />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-bold">Full width</p>
                    </TooltipContent>
                  </Tooltip>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="fixed"
                  onClick={() =>
                    setCustomizations((prev) => ({
                      ...prev,
                      inputsWidthType: "fixed",
                    }))
                  }
                >
                  <Tooltip>
                    <TooltipTrigger>
                      <ArrowDownToDot />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-bold">Fixed width</p>
                    </TooltipContent>
                  </Tooltip>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <div className="flex flex-col justify-end gap-2">
            <div className="relative">
              <Input
                type={
                  customizations.inputsWidthType === "auto" ? "text" : "number"
                }
                value={
                  customizations.inputsWidthType === "full"
                    ? "100"
                    : customizations.inputsWidth
                }
                disabled={customizations.inputsWidthType === "full"}
                onChange={(e) => {
                  setCustomizations((prev: any) => ({
                    ...prev,
                    inputsWidth: e.target.value,
                  }));
                }}
              ></Input>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                {customizations.inputsWidthType === "fixed" ? `px` : `%`}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Muted className="text-xs">Height</Muted>
            <div className="relative">
              <Input
                type="number"
                value={customizations.inputsHeight ?? "16"}
                onChange={(e) => {
                  setCustomizations((prev: any) => ({
                    ...prev,
                    inputsHeight: e.target.value,
                  }));
                }}
              ></Input>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                {`px`}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <Muted className="text-xs">Background</Muted>
            <ColorPicker
              color={customizations.inputsBackgroundColor ?? "#FFFFFF"}
              onChange={(color) => {
                setCustomizations((prev) => ({
                  ...prev,
                  inputsBackgroundColor: color,
                  theme: "custom",
                }));
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Muted className="text-xs">Border</Muted>
            <ColorPicker
              color={customizations.inputsBorderColor}
              onChange={(color) => {
                setCustomizations((prev) => ({
                  ...prev,
                  inputsBorderColor: color,
                  theme: "custom",
                }));
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Muted className="text-xs">Border width</Muted>
            <div className="relative">
              <Input
                type="number"
                value={customizations.inputsBorderWidth ?? "1"}
                onChange={(e) => {
                  setCustomizations((prev: any) => ({
                    ...prev,
                    inputsBorderWidth: e.target.value,
                  }));
                }}
              ></Input>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                {`px`}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Muted className="text-xs">Corner radius</Muted>
            <div className="relative">
              <Input
                type="number"
                value={customizations.inputsRadius ?? "16"}
                onChange={(e) => {
                  setCustomizations((prev: any) => ({
                    ...prev,
                    inputsRadius: e.target.value,
                  }));
                }}
              ></Input>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                {`px`}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <Muted className="text-xs">Margin bottom</Muted>
            <div className="relative">
              <Input
                type="number"
                value={customizations.inputsMarginBottom ?? "10"}
                onChange={(e) => {
                  setCustomizations((prev: any) => ({
                    ...prev,
                    inputsMarginBottom: e.target.value,
                  }));
                }}
              ></Input>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                {`px`}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Muted className="text-xs">Horizontal padding</Muted>
            <div className="relative">
              <Input
                type="number"
                value={customizations.inputsHorizontalPadding ?? "10"}
                onChange={(e) => {
                  setCustomizations((prev: any) => ({
                    ...prev,
                    inputsHorizontalPadding: e.target.value,
                  }));
                }}
              ></Input>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                {`px`}
              </span>
            </div>
          </div>
        </div>
        <H4 className="py-4">Buttons</H4>
        <div className="flex w-full gap-2">
          <div className="col-start-1 col-end-3 flex flex-col gap-2">
            <Muted className="text-xs">Width</Muted>
            <div className="flex justify-center rounded-md bg-primary/5 p-0.5">
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={customizations.buttonWidthType}
              >
                <ToggleGroupItem
                  value="auto"
                  onClick={() =>
                    setCustomizations((prev) => ({
                      ...prev,
                      buttonWidthType: "auto",
                    }))
                  }
                >
                  <Tooltip>
                    <TooltipTrigger>
                      <ArrowRightFromLine />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-bold">Auto width</p>
                    </TooltipContent>
                  </Tooltip>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="full"
                  onClick={() =>
                    setCustomizations((prev) => ({
                      ...prev,
                      buttonWidthType: "full",
                    }))
                  }
                >
                  <Tooltip>
                    <TooltipTrigger>
                      <MoveHorizontal />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-bold">Full width</p>
                    </TooltipContent>
                  </Tooltip>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="fixed"
                  onClick={() =>
                    setCustomizations((prev) => ({
                      ...prev,
                      buttonWidthType: "fixed",
                    }))
                  }
                >
                  <Tooltip>
                    <TooltipTrigger>
                      <ArrowDownToDot />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-bold">Fixed width</p>
                    </TooltipContent>
                  </Tooltip>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <div className="flex flex-col justify-end gap-2">
            <div className="relative">
              <Input
                type={
                  customizations.buttonWidthType === "auto" ? "text" : "number"
                }
                value={
                  customizations.buttonWidthType === "auto"
                    ? "auto"
                    : customizations.buttonWidthType === "full"
                      ? "100"
                      : customizations.buttonWidth
                }
                disabled={
                  customizations.buttonWidthType === "auto" ||
                  customizations.buttonWidthType === "full"
                }
                onChange={(e) => {
                  setCustomizations((prev: any) => ({
                    ...prev,
                    buttonWidth: e.target.value,
                  }));
                }}
              ></Input>
              {customizations.buttonWidthType !== "auto" && (
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                  {customizations.buttonWidthType === "fixed" ? `px` : `%`}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Muted className="text-xs">Height</Muted>
            <div className="relative">
              <Input
                type="number"
                value={customizations.buttonHeight ?? "16"}
                onChange={(e) => {
                  setCustomizations((prev: any) => ({
                    ...prev,
                    buttonHeight: e.target.value,
                  }));
                }}
              ></Input>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                {`px`}
              </span>
            </div>
          </div>
        </div>
        <div className="flex w-full gap-2">
          <div className="col-start-1 col-end-3 flex flex-col gap-2">
            <Muted className="text-xs">Alignment</Muted>
            <div className="flex justify-center rounded-md bg-primary/5 p-0.5">
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={customizations.buttonAlignment}
              >
                <ToggleGroupItem
                  value="left"
                  onClick={() =>
                    setCustomizations((prev) => ({
                      ...prev,
                      buttonAlignment: "left",
                    }))
                  }
                >
                  <Tooltip>
                    <TooltipTrigger>
                      <AlignLeft />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-bold">Left</p>
                    </TooltipContent>
                  </Tooltip>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="center"
                  onClick={() =>
                    setCustomizations((prev) => ({
                      ...prev,
                      buttonAlignment: "center",
                    }))
                  }
                >
                  <Tooltip>
                    <TooltipTrigger>
                      <AlignJustify />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-bold">Center</p>
                    </TooltipContent>
                  </Tooltip>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="right"
                  onClick={() =>
                    setCustomizations((prev) => ({
                      ...prev,
                      buttonAlignment: "right",
                    }))
                  }
                >
                  <Tooltip>
                    <TooltipTrigger>
                      <AlignRight />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-bold">Right</p>
                    </TooltipContent>
                  </Tooltip>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <div className="flex flex-col justify-end gap-2">
            <Muted className="text-xs">Font size</Muted>
            <div className="relative">
              <Input
                type="number"
                value={customizations.buttonFontSize}
                onChange={(e) => {
                  setCustomizations((prev: any) => ({
                    ...prev,
                    buttonFontSize: e.target.value,
                  }));
                }}
              ></Input>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                {`px`}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Muted className="text-xs">Corner radius</Muted>
            <div className="relative">
              <Input
                type="number"
                value={customizations.buttonRadius ?? "16"}
                onChange={(e) => {
                  setCustomizations((prev: any) => ({
                    ...prev,
                    buttonRadius: e.target.value,
                  }));
                }}
              ></Input>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                {`px`}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <Muted className="text-xs">Button Color</Muted>
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
            <Muted className="text-xs">Button Text</Muted>
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
          <div className="flex flex-col gap-2">
            <Muted className="text-xs">Vertical margin</Muted>
            <div className="relative">
              <Input
                type="number"
                value={customizations.buttonVerticalMargin ?? "1"}
                onChange={(e) => {
                  setCustomizations((prev: any) => ({
                    ...prev,
                    buttonVerticalMargin: e.target.value,
                  }));
                }}
              ></Input>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                {`px`}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Muted className="text-xs">Horizontal padding</Muted>
            <div className="relative">
              <Input
                type="number"
                value={customizations.buttonHorizontalPadding ?? "16"}
                onChange={(e) => {
                  setCustomizations((prev: any) => ({
                    ...prev,
                    buttonHorizontalPadding: e.target.value,
                  }));
                }}
              ></Input>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-xs text-gray-500">
                {`px`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormCustomization;
